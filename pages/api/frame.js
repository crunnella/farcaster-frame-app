import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios'; // For sending notifications
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const NOTIFICATION_THRESHOLD = 2;
const NOTIFICATION_COOLDOWN = 3600000; // 1 hour cooldown in milliseconds

// Shop items
const shopItems = {
    toy: { cost: 5, effect: { happiness: 2 } },
    treat: { cost: 3, effect: { hunger: -2 } }
};

export default async function handler(req, res) {
    const { fid, action, item } = req.query;

    if (!fid) {
        return res.status(400).json({ error: 'Missing user ID' });
    }

    // Fetch pet data from Supabase
    let { data: pet, error } = await supabase
        .from('pets')
        .select('*')
        .eq('fid', fid)
        .single();

    if (error && error.code !== 'PGRST116') {
        return res.status(500).json({ error: 'Database error' });
    }

    // Initialize pet if new user
    if (!pet) {
        pet = { fid, hunger: 5, happiness: 5, coins: 0, lastNotified: 0 };
        await supabase.from('pets').insert([pet]);
    }

    // Update pet based on action
    if (action === 'feed') {
        pet.hunger = Math.max(0, pet.hunger - 1);
        pet.coins += 1;
    } else if (action === 'play') {
        pet.happiness = Math.min(10, pet.happiness + 1);
        pet.coins += 2;
    } else if (action === 'buy' && shopItems[item]) {
        const selectedItem = shopItems[item];
        if (pet.coins >= selectedItem.cost) {
            pet.coins -= selectedItem.cost;
            pet.hunger = Math.max(0, pet.hunger + 
(selectedItem.effect.hunger || 0));
            pet.happiness = Math.min(10, pet.happiness + 
(selectedItem.effect.happiness || 0));
        } else {
            return res.status(400).json({ error: 'Not enough coins' });
        }
    }

    // Check if pet needs attention and send notification
    const now = Date.now();
    if ((pet.hunger <= NOTIFICATION_THRESHOLD || pet.happiness <= 
NOTIFICATION_THRESHOLD) && 
        (now - pet.lastNotified > NOTIFICATION_COOLDOWN)) {
        await sendNotification(fid, "Your pet needs attention! Come back 
to feed and play with it.");
        pet.lastNotified = now;
    }

    // Update pet data in Supabase
    await supabase.from('pets').update(pet).eq('fid', fid);

    // Generate Frame metadata
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta property="og:title" content="Your Virtual Pet" />
            <meta property="og:image" 
content="https://example.com/pet.png" />
            <meta property="og:description" content="Hunger: ${pet.hunger} 
| Happiness: ${pet.happiness} | Coins: ${pet.coins}" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:button:1" content="Feed" />
            <meta property="fc:frame:button:1:action" 
content="post_redirect" />
            <meta property="fc:frame:button:1:target" 
content="https://your-vercel-url.vercel.app/api/frame?fid=${fid}&action=feed" 
/>
            <meta property="fc:frame:button:2" content="Play" />
            <meta property="fc:frame:button:2:action" 
content="post_redirect" />
            <meta property="fc:frame:button:2:target" 
content="https://your-vercel-url.vercel.app/api/frame?fid=${fid}&action=play" 
/>
            <meta property="fc:frame:button:3" content="Buy Toy (5 coins)" 
/>
            <meta property="fc:frame:button:3:action" 
content="post_redirect" />
            <meta property="fc:frame:button:3:target" 
content="https://your-vercel-url.vercel.app/api/frame?fid=${fid}&action=buy&item=toy" 
/>
            <meta property="fc:frame:button:4" content="Buy Treat (3 
coins)" />
            <meta property="fc:frame:button:4:action" 
content="post_redirect" />
            <meta property="fc:frame:button:4:target" 
content="https://your-vercel-url.vercel.app/api/frame?fid=${fid}&action=buy&item=treat" 
/>
        </head>
        <body>
            <h1>Your Virtual Pet</h1>
        </body>
        </html>
    `);
}

// Function to send notifications (stub for now, replace with actual API 
call)
async function sendNotification(fid, message) {
    console.log(`Sending notification to ${fid}: ${message}`);
    // Replace with actual notification logic, e.g., via Warpcast API
}

