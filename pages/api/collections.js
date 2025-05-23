// pages/api/collections.js
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

    // Hent produktinfo for hver line item
    const productIds = new Set();
    allOrders.forEach(order => {
      order.line_items.forEach(item => {
        if (item.product_id) productIds.add(item.product_id);
      });
    });

    const productIdArray = Array.from(productIds);
    const productToCollection = {};

    for (const id of productIdArray) {
      try {
        const resp = await axios.get(`https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/products/${id}.json`, { headers });
        const product = resp.data.product;

        (product?.tags?.split(',') || []).forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) {
            if (!productToCollection[trimmed]) {
              productToCollection[trimmed] = new Set();
            }
            productToCollection[trimmed].add(id);
          }
        });
      } catch (e) {
        console.warn(`Kunne ikke hente produkt ${id}`);
      }
    }

    const collectionStats = {};

    allOrders.forEach(order => {
      order.line_items.forEach(item => {
        const productId = item.product_id;
        const quantity = Number(item.quantity || 0);
        const revenue = Number(item.price || 0) * quantity;

        for (const [collection, ids] of Object.entries(productToCollection)) {
          if (ids.has(productId)) {
            if (!collectionStats[collection]) {
              collectionStats[collection] = { title: collection, totalSold: 0, totalRevenue: 0 };
            }
            collectionStats[collection].totalSold += quantity;
            collectionStats[collection].totalRevenue += revenue;
          }
        }
      });
    });

    res.status(200).json({ collections: Object.values(collectionStats) });
  } catch (error) {
    console.error('FEIL I COLLECTIONS API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Kunne ikke hente collections' });
  }
}