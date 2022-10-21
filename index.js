const express = require('express');
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 5000;
const serviceAccount =JSON.parse (process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



//connecting mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ahltbit.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



//verify idToken

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        try {
            const idToken = req.headers?.authorization?.split(' ')[1];
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedEmail = decodedUser?.email;
        }
        catch {

        }
    }
    next();



}

//using mongodb
async function run() {
    try {
        const database = client.db("eliteCare");
        const appointmentCollection = database.collection("appointment");
        const usersCollection = database.collection("users");

        app.post('/appointment', async (req, res) => {
            const appointmentInfo = req.body;
            const result = await appointmentCollection.insertOne(appointmentInfo);
            res.json(result);
        })
        app.get('/appointment', async (req, res) => {
            const client = req.query.email;
            const query = { email: client };
            const cursor = appointmentCollection.find(query);
            const result = await cursor.toArray();
            res.json(result);
        })
        app.delete('/appointment', async (req, res) => {
            const canceledAppointmentId = req?.body?.canceledAppointment;
            const query = { _id: ObjectId(canceledAppointmentId) };
            const result = await appointmentCollection.deleteOne(query);
            res.json(result);

        })
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const result = await usersCollection.insertOne(newUser);
            res.json(result)

        })
        app.put('/users', async (req, res) => {
            const newUser = req.body;
            const filter = { email: newUser.email }
            const options = { upsert: true };
            const updateDoc = {
                $set: newUser,
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            console.log(result)
        })
        app.post('/users/admin', verifyToken, async (req, res) => {
            const newAdmin = req.body.email;
            const decodedEmail = req.decodedEmail;
            const query = { email: decodedEmail };
            const admin = await usersCollection.findOne(query);
            if (admin?.role === "admin") {
                const filter = { email: newAdmin };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.json(result);
            }
            else {
                res.json({})
            }


        })
        app.get('/users/:email', async (req, res) => {
            const loggedInEmail = req.params.email;
            const query = { email: loggedInEmail }
            const result = await usersCollection.findOne(query);
            res.json(result);

        })




    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Getting started with elitecare server')
})
app.listen(port, () => {
    console.log("listening to port ", port)
})