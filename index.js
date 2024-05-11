const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000



app.use(express.json())
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
    optionsSuccessStatus: 200
}))


app.get('/', (req, res) => {
    res.send('server running....!')
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@ms-creator.yqb9vtj.mongodb.net/?retryWrites=true&w=majority&appName=ms-creator`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const productCollection = client.db("smFood").collection('foodItems');
        const productRequestCollection = client.db("smFood").collection('foodRequest');

        app.get('/food', async (req, res) => {
            const result = await productCollection.find().toArray()
            res.send(result)
        })

        app.post('/food', async (req, res) => {
            const body = req.body
            // console.log(body);
            const result = await productCollection.insertOne(body)
            res.send(result)
        })

        app.get('/food/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send(result)
        })

        app.get('/food-counts', async (req, res) => {
            const search = req.query.search
            let query = {
                FoodName: { $regex: search, $options: 'i' },
            }
            const foodCounts = await productCollection.countDocuments(query)
            res.send({ foodCounts })
        })

        app.get('/food-All', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const filter = req.query.filter;
            const search = req.query.search;
            let query = {
                FoodName: { $regex: search, $options: 'i' },
            }
            let options = {};

            if (filter) {
                options = { sort: { ExpiredDateTime: filter === 'less time' ? 1 : -1 } };
            }

            const result = await productCollection.find(query, options).skip((page - 1) * size).limit(size).toArray();
            res.send(result);
        });
        app.get('/foods/:email', async (req, res) => {
            const email = req.params.email
            const query = { "Donator.DonatorEmail": email }
            const result = await productCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/food-request',async(req,res)=>{
            const result = await productRequestCollection.find().toArray()
            res.send(result)
        })

        app.post('/food-request',async(req,res)=>{
            const body = req.body
            const result = await productRequestCollection.insertOne(body)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log('port is running ', port);
})