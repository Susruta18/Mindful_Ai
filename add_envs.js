const { execSync } = require('child_process');
const fs = require('fs');

const envs = {
  MONGO_URI: "YOUR_MONGO_URI_HERE",
  JWT_SECRET: "YOUR_JWT_SECRET_HERE",
  GROQ_API_KEY: "YOUR_GROQ_API_KEY_HERE"
};

for (const [key, value] of Object.entries(envs)) {
  fs.writeFileSync('temp_val.txt', value);
  try {
    execSync(`npx vercel env rm ${key} production -y`, {stdio: 'ignore'});
  } catch(e) {}
  console.log(`Adding ${key}...`);
  execSync(`cmd /c "type temp_val.txt | npx vercel env add ${key} production"`, {stdio: 'inherit'});
}
fs.unlinkSync('temp_val.txt');
console.log("Done.");
