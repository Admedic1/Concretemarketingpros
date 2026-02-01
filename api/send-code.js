export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Format phone number (ensure it starts with +1 for US)
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = '+1' + formattedPhone;
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        // Send verification via Twilio Verify API
        const response = await fetch(
            `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
            {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    To: formattedPhone,
                    Channel: 'sms'
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            return res.status(200).json({ 
                success: true, 
                status: data.status,
                message: 'Verification code sent!'
            });
        } else {
            console.error('Twilio error:', data);
            return res.status(400).json({ 
                error: 'Failed to send code',
                details: data.message 
            });
        }

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            error: 'Failed to send verification code',
            details: error.message 
        });
    }
}
