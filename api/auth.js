export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { code } = req.query;
    
    if (!code) {
        return res.status(400).json({ error: 'No authorization code provided' });
    }
    
    try {
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
                redirect_uri: process.env.ROBLOX_REDIRECT_URI
            })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            return res.status(400).json({ error: tokenData.error_description });
        }
        
        // Get user info
        const userResponse = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });
        
        const userData = await userResponse.json();
        
        // Fetch avatar
        const avatarResponse = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.sub}&size=150x150&format=Png&isCircular=false`
        );
        const avatarData = await avatarResponse.json();
        
        res.json({
            id: userData.sub,
            name: userData.name,
            displayName: userData.nickname || userData.name,
            avatarUrl: avatarData.data[0]?.imageUrl || null
        });
        
    } catch (error) {
        console.error('OAuth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}