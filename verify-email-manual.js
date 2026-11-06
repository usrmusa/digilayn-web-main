const admin = require('firebase-admin');
admin.initializeApp();

const uid = '6M3TZC2Xc7Tn7OgEZybBFtmegAl1';

admin.auth().updateUser(uid, {
    emailVerified: true
})
    .then((userRecord) => {
        console.log('Successfully updated user:', userRecord.toJSON());
    })
    .catch((error) => {
        console.log('Error updating user:', error);
    });
