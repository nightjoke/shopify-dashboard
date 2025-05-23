// pages/api/products.js
import axios from 'axios';

export default async function handler(req, res) {
  const { SHOPIFY_STORE_URL, SHOPIFY_API_VERSION, SHOPIFY_API_TOKEN } = process.env;
  const { from, to } = req.query;

  const headers = {
    'X-Shopify-Access-Token': SHOPIFY_API_TOKEN,
    'Content-Type': 'application/json'
  };

  let allOrders = [];
  let url = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/orders.json`;
  let params = {
    limit: 250,
    created_at_min: new Date(from + 'T00:00:00Z').toISOString(),
    created_at_max: new Date(to + 'T23:59:59Z').toISOString(),
    status: 'any'
  };

  try {
    // Hent ordrer
    while (url) {
      const response = await axios.get(url, { headers, params });
      allOrders = allOrders.concat(response.data.orders);

      const linkHeader = response.headers['link'];
      const nextLink = linkHeader?.split(',').find((s) => s.includes('rel="next"'));
      if (nextLink) {
        const match = nextLink.match(/<([^>]+)>/);
        url = match ? match[1] : null;
        params = undefined;
      } else {
        url = null;
      }
    }

    // Samle produktdata
    const productMap = {};
    const inventoryItemIds = new Set();

    allOrders.forEach(order => {
      order.line_items.forEach(item => {
        const variantId = item.variant_id;
        const inventoryId = item.inventory_item_id;
        const quantity = Number(item.quantity || 0);
        const revenue = Number(item.price || 0) * quantity;

        if (!productMap[variantId]) {
          productMap[variantId] = {
            title: item.title,
            variantTitle: item.variant_title || '',
            inventoryItemId: inventoryId,
            totalSold: 0,
            totalRevenue: 0
          };
        }

        productMap[variantId].totalSold += quantity;
        productMap[variantId].totalRevenue += revenue;

        if (inventoryId) inventoryItemIds.add(inventoryId);
      });
    });

    // Hent COGS via inventory_items.json
    const inventoryIdArray = Array.from(inventoryItemIds);
    const chunkSize = 100;
    const costMap = {};

    for (let i = 0; i < inventoryIdArray.length; i += chunkSize) {
      const chunk = inventoryIdArray.slice(i, i + chunkSize);
      const idsParam = chunk.join(',');
      const costResponse = await axios.get(
        `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/inventory_items.json?ids=${idsParam}`,
        { headers }
      );

      const items = costResponse.data.inventory_items || [];
      items.forEach(item => {
        costMap[item.id] = Number.parseFloat(item.cost || 0);
      });
    }

    // Bygg respons
    const products = Object.values(productMap).map(p => {
      const cost = costMap[p.inventoryItemId] || 0;
      const totalCost = cost * p.totalSold;
      const margin = p.totalRevenue - totalCost;

      return {
        title: p.title,
        variantTitle: p.variantTitle,
        totalSold: p.totalSold,
        costPerUnit: cost,
        margin
      };
    });

    res.status(200).json({ products });
  } catch (error) {
    console.error('FEIL I PRODUCT API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Kunne ikke hente produktdata' });
  }
}
