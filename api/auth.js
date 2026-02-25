// Helper function to fetch avatar from server-side
async function fetchAvatarFromServer(userId) {
    try {
        const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0 && data.data[0].imageUrl) {
            return data.data[0].imageUrl;
        } else {
            return '/image/avatar-default.png';
        }
    } catch (error) {
        console.error(`Server-side avatar fetch error for ${userId}:`, error);
        return '/image/avatar-default.png';
    }
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { code, userId } = req.query;
    
    // Handle avatar fetching endpoint
    if (userId && !code) {
        console.log(`Fetching avatar for user: ${userId}`);
        const avatarUrl = await fetchAvatarFromServer(userId);
        console.log(`Avatar URL: ${avatarUrl}`);
        
        res.json({ avatarUrl });
        return;
    }
    
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
        console.log('User fields - name:', userData.name, 'nickname:', userData.nickname);
        
        // Fetch avatar from server-side
        const avatarUrl = await fetchAvatarFromServer(userData.sub);
        
        // Create user data object
        const userObj = {
            id: userData.sub,
            name: userData.name,
            displayName: userData.nickname || userData.name, // Use nickname if available, otherwise fallback to name
            avatarUrl: avatarUrl
        };
        
        console.log('User object being sent to frontend:', userObj);
        
        // Redirect back to frontend with user data as URL parameter
        const frontendUrl = req.headers.origin || 'https://rblx-donate.vercel.app';
        const userDataParam = encodeURIComponent(JSON.stringify(userObj));
        
        console.log('Redirecting to:', `${frontendUrl}/?auth_success=true&user=${userDataParam.substring(0, 100)}...`);
        
        res.redirect(`${frontendUrl}/?auth_success=true&user=${userDataParam}`);
        
    } catch (error) {
        console.error('OAuth error:', error);
        const frontendUrl = req.headers.origin || 'https://rblx-donate.vercel.app';
        res.redirect(`${frontendUrl}/?auth_error=${encodeURIComponent(error.message)}`);
    }
}