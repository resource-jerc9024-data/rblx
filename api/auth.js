export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { code } = req.query;
    
    if (!code) {
        return res.status(400).json({ error: 'No authorization code provided' });
    }
    
    try {
        console.log('Exchanging code for token...');
        
        // Exchange code for token
        const tokenResponse = await fetch('https://apis.roblox.com/oauth/v1/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(
                    process.env.ROBLOX_CLIENT_ID + ':' + process.env.ROBLOX_CLIENT_SECRET
                ).toString('base64')
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.ROBLOX_REDIRECT_URI || (req.headers.origin + '/api/auth')
            })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            console.error('Token error:', tokenData);
            return res.status(400).json({ 
                error: tokenData.error_description || 'Failed to get token'
            });
        }
        
        console.log('Got token, fetching user info...');
        
        // Get user info from Roblox
        const userResponse = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });
        
        const userData = await userResponse.json();
        
        if (!userData.sub) {
            throw new Error('No user ID in response');
        }
        
        console.log('Got user data:', userData);
        
        // Fetch avatar from Roblox
        const avatarResponse = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.sub}&size=150x150&format=Png&isCircular=false`
        );
        const avatarData = await avatarResponse.json();
        
        // Return the real Roblox data
        res.json({
            id: userData.sub,
            name: userData.name,
            displayName: userData.nickname || userData.name,
            avatarUrl: avatarData.data[0]?.imageUrl || null
        });
        
    } catch (error) {
        console.error('OAuth error:', error);
        res.status(500).json({ 
            error: 'Authentication failed', 
            details: error.message 
        });
    }
}