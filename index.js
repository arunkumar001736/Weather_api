require('dotenv').config();
const axios = require('axios');
const twilio = require('twilio');
const cron = require('node-cron');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ✅ List of locations to monitor
// Format: { name: "Place Name", lat: x, lon: y }
const locations = [
  { name: "Theni", lat: 10.0104, lon: 77.4777 },
  { name: "Cumbum", lat: 9.9167, lon: 77.2833 },
  { name: "Kumily", lat: 9.7112, lon: 77.1290 },
  { name: "Madurai", lat: 9.9252, lon: 78.1198 },
  { name: "covai", lat: 11.003496, lon:  76.972034 },
  // Add more as needed
];

// Keep track of rain state for each location to avoid repeated messages
const rainState = {}; // { "Theni": true/false, "Cumbum": true/false }

async function checkRain() {
  for (const loc of locations) {
    try {
      const url = `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${loc.lat},${loc.lon}&aqi=no`;
      const res = await axios.get(url);
      const data = res.data;
      const condition = data.current.condition.text.toLowerCase();
      const temp = data.current.temp_c;
      const isRaining = condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunder');

      console.log(`[${new Date().toLocaleString()}] ${loc.name}: ${condition}, ${temp}°C`);

      if (isRaining && !rainState[loc.name]) {
        const msg = `🌧️ *Rain Alert!* It's currently ${condition} in ${loc.name}.\n🌡️ Temperature: ${temp}°C.\n💧 Please check your fields!`;

        try {
          await client.messages.create({
            from: process.env.TWILIO_WHATSAPP_FROM,
            to: process.env.WHATSAPP_TO,
            body: msg,
          });
          console.log(`✅ WhatsApp message sent for ${loc.name}`);
        } catch (err) {
          console.error(`❌ Failed to send message for ${loc.name}:`, err.message);
        }

        rainState[loc.name] = true; // mark as alerted
      } else if (!isRaining) {
        rainState[loc.name] = false; // reset state
      }

    } catch (err) {
      console.error(`❌ Error fetching weather for ${loc.name}:`, err.message);
    }
  }
}

// ⏱️ Run every 5 minutes
cron.schedule('*/5 * * * *', checkRain);

// Initial check
console.log('🌦️ Multi-location rain alert system started...');
checkRain();
