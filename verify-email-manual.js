const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

// Resolve firebase-admin using Backend/functions where dependencies are installed
const backendFunctionsPackage = path.resolve(__dirname, '../../Backend/functions/package.json');
const backendRequire = createRequire(backendFunctionsPackage);
const { initializeApp, cert, applicationDefault } = backendRequire('firebase-admin/app');
const { getAuth } = backendRequire('firebase-admin/auth');

const uid = process.argv[2] || '6M3TZC2Xc7Tn7OgEZybBFtmegAl1';
const projectId = 'digilayn-projects';

const options = { projectId };

// Check for local service-account.json if present
const localKeyPath = path.resolve(__dirname, 'service-account.json');
const backendKeyPath = path.resolve(__dirname, '../../Backend/service-account.json');

if (fs.existsSync(localKeyPath)) {
  options.credential = cert(require(localKeyPath));
} else if (fs.existsSync(backendKeyPath)) {
  options.credential = cert(require(backendKeyPath));
} else {
  options.credential = applicationDefault();
}

const app = initializeApp(options);
const auth = getAuth(app);

auth.updateUser(uid, {
  emailVerified: true
})
  .then((userRecord) => {
    console.log('Successfully updated user emailVerified to true:');
    console.log(JSON.stringify({
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified
    }, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error updating user:', error.message);
    if (error.message && error.message.includes('Could not load the default credentials')) {
      console.log('\nTo authenticate, either:');
      console.log('1. Run in terminal: gcloud auth application-default login');
      console.log('   OR');
      console.log('2. Download a private key from Firebase Console (Project Settings > Service accounts > Generate new private key), save it as service-account.json in this directory, and re-run.');
    }
    process.exit(1);
  });
