import Stripe from 'stripe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

async function createPrice() {
  try {
    console.log('Creating Stripe product and price...');
    
    // Create a product
    const product = await stripe.products.create({
      name: 'BioFlo Pro',
      description: 'Monthly subscription to BioFlo Pro - Your biohacking personal assistant',
    });
    
    console.log('✅ Product created:', product.id);
    
    // Create a recurring price (£14.99/month)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 1499, // £14.99 in pence
      currency: 'gbp',
      recurring: {
        interval: 'month',
      },
    });
    
    console.log('\n✅ Price created successfully!');
    console.log('\n📋 Add this to your .env.local:');
    console.log(`STRIPE_PRICE_ID=${price.id}\n`);
    
    return price.id;
  } catch (error) {
    console.error('❌ Error creating price:', error.message);
    process.exit(1);
  }
}

createPrice();
