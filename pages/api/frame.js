import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const shopItems = {
  toy: { cost: 5, effect: { happiness: 2 } },
  treat: { cost: 3, effect: { hunger: -2 } },
};

export default async function handler(req, res) {
  const { fid, action, item } = req.query;

  if (!fid) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  let { data: pet, error } = await supabase
    .from('pets')
    .select('*')
    .eq('fid', fid)
    .single();

  // Assign a random pet type if it's a new user
  if (!pet) {
    const availableTypes = ["cat", "dog", "bunny", "dragon", "blob"];
    const randomPet = availableTypes[Math.floor(Math.random() * 
availableTypes.length)];

    pet = { fid, hunger: 5, happiness: 5, coins: 0, pet_type: randomPet };
    await supabase.from('pets').insert([pet]);
  }

  // Handle actions
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
      pet.hunger = Math.max(0, pet.hunger + (selectedItem.effect.hunger || 
0));
      pet.happiness = Math.min(10, pet.happiness + 
(selectedItem.effect.happiness || 0));
    } else {
      return res.status(400).json({ error: 'Not enough coins' });
    }
  }

  await supabase.from('pets').update(pet).eq('fid', fid);

  // Pick the pet image
  const petImage = 
`https://farcaster-frame-app-nu.vercel.app/pet_${pet.pet_type}.png`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Your Virtual Pet" />
  <meta property="og:image" content="${petImage}" />
  <meta property="og:description" content="Hunger: ${pet.hunger} | 
Happiness: ${pet.happiness} | Coins: ${pet.coins}" />
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:button:1" content="Feed" />
  <meta property="fc:frame:button:1:action" content="post_redirect" />
  <meta property="fc:frame:button:1:target" 
content="https://farcaster-frame-app-nu.vercel.app/api/frame?fid=${fid}&action=feed" 
/>
  <meta property="fc:frame:button:2" content="Play" />
  <meta property="fc:frame:button:2:action" content="post_redirect" />
  <meta property="fc:frame:button:2:target" 
content="https://farcaster-frame-app-nu.vercel.app/api/frame?fid=${fid}&action=play" 
/>
  <meta property="fc:frame:button:3" content="Buy Toy (5 coins)" />
  <meta property="fc:frame:button:3:action" content="post_redirect" />
  <meta property="fc:frame:button:3:target" 
content="https://farcaster-frame-app-nu.vercel.app/api/frame?fid=${fid}&action=buy&item=toy" 
/>
  <meta property="fc:frame:button:4" content="Buy Treat (3 coins)" />
  <meta property="fc:frame:button:4:action" content="post_redirect" />
  <meta property="fc:frame:button:4:target" 
content="https://farcaster-frame-app-nu.vercel.app/api/frame?fid=${fid}&action=buy&item=treat" 
/>
</head>
<body>
  <h1>Your Virtual Pet</h1>
</body>
</html>`);
}

