import axios from 'axios';

export default async function handler(req, res) {
  const { SHOPIFY_STORE_URL, SHOPIFY_API_VERSION, SHOPIFY_API_TOKEN } = process.env;
  const { from, to } = req.query;

  const baseUrl = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/orders.json`;

  const headers = {
    'X-Shopify-Access-Token': SHOPIFY_API_TOKEN,
    'Content-Type': 'application/json'
  };

  let allOrders = [];
  let url = baseUrl;
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

    let totalNetSales = 0;
    let totalReturns = 0;
    let totalShipping = 0;
    let totalTaxes = 0;
    let totalDuties = 0;
    let totalTips = 0;

    allOrders.forEach(order => {
      const netSales = Number.parseFloat(order.subtotal_price || 0);
      const shipping = Number.parseFloat(order.total_shipping_price_set?.presentment_money?.amount || 0);
      const taxes = Number.parseFloat(order.total_tax || 0);
      const duties = Number.parseFloat(order.total_duties || 0);
      const tips = Number.parseFloat(order.total_tip_received || 0);

      const refunds = (order.refunds || []).reduce((sum, refund) => {
        return sum + (refund.transactions || []).reduce((txSum, tx) => {
          return txSum + Number.parseFloat(tx.amount || 0);
        }, 0);
      }, 0);

      totalNetSales += netSales;
      totalReturns += refunds;
      totalShipping += shipping;
      totalTaxes += taxes;
      totalDuties += duties;
      totalTips += tips;
    });

    const totalSales = totalNetSales + totalReturns + totalTaxes + totalDuties + totalTips;
    const totalOrders = allOrders.length || 1;
    const avgOrderValue = (totalSales - totalShipping) / totalOrders;

    res.status(200).json({
      totalOrders,
      totalSales,
      avgOrderValue,
      totalNetSales,
      totalReturns,
      totalShipping,
      totalTaxes,
      totalDuties,
      totalTips
    });
  } catch (error) {
    console.error('API FEIL:', error.response?.data || error.message);
    res.status(500).json({ error: 'Noe gikk galt med Shopify-kallet.' });
  }
}
