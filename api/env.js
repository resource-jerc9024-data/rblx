// Vercel Serverless Function to expose public Firebase config
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  try {
    // Check if required environment variables exist
    const requiredVars = [
      'FIREBASE_API_KEY',
      'FIREBASE_AUTH_DOMAIN', 
      'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET',
      'FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_APP_ID'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars.join(', '));
      return res.status(500).json({ 
        error: 'Server configuration error',
        missing: missingVars 
      });
    }
    
    // Return the Firebase config (these are public values, safe to expose)
    res.status(200).json({
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || ''
    });
  } catch (error) {
    console.error('Error in env API:', error);
    res.status(500).json({ error: 'Failed to load environment variables' });
  }
};