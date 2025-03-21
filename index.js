const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const port = process.env.PORT || 5000



app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: ['http://localhost:5173', 'https://sm-food.web.app'],
    credentials: true,
    optionsSuccessStatus: 200
}))


const verifyToken = async (req, res, next) => {
    const token = await req.cookies?.token
    if (!token) return res.status(401).send({ message: 'unauthenticated' })
    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN, (error, success) => {
            if (error) {
                return res.status(401).send({ message: 'unauthenticated' })
            }
            req.user = success
            next()
        })
    }
}





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
        // await client.connect();
        const productCollection = client.db("smFood").collection('foodItems');
        const productRequestCollection = client.db("smFood").collection('foodRequest');
        const reviewCollection = client.db("smFood").collection('review');

        // cookies middlewares 
        //creating Token
        app.post("/jwt", async (req, res) => {
            const body = req.body;
            const token = jwt.sign(body, process.env.ACCESS_TOKEN, {
                expiresIn: '365d',
            });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            }).send({ success: true })
        });

        app.get('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                maxAge: 0,
            })
                .send({ LogOutCookie: true })
        })

        app.get('/review',async(req,res)=>{
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })
        app.post('/review',async(req,res)=>{
            const review = req.body
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })

        app.get('/food', async (req, res) => {
            const query = { status: { $nin: ['Requested'] }, }
            const result = await productCollection.find(query).toArray()



            res.send(result)
        })

        app.post('/food', async (req, res) => {
            const body = req.body
            // console.log(body);
            const result = await productCollection.insertOne(body)
            res.send(result)
        })
        app.put('/food/:id', async (req, res) => {
            const id = req.params.id
            const { status } = req.body
            // console.log(status);
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    status: status,
                },
            }
            const result = await productCollection.updateOne(query, updateDoc, options)
            // console.log(result);
            res.send(result)
        })
        app.put('/foods/:id', async (req, res) => {
            const id = req.params.id
            const body = req.body
            // console.log(body);
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    ExpiredDateTime: body.date,
                    AdditionalNotes: body.notes,
                    FoodQuantity: body.quantity,
                },
            }
            const result = await productCollection.updateOne(query, updateDoc, options)
            // console.log(result);
            res.send(result)
        })
        app.delete('/food/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query)
            // console.log(result);
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
                status: { $nin: ['Requested'] },
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
                status: { $nin: ['Requested'] },
            }
            let options = {};

            if (filter) {
                options = { sort: { ExpiredDateTime: filter === 'less time' ? 1 : -1 } };
            }

            const result = await productCollection.find(query, options).skip((page - 1) * size).limit(size).toArray();
            res.send(result);
        });
        app.get('/foods/:email', verifyToken, async (req, res) => {
            const token = req.user.email
            const email = req.params.email
            if (token !== email) return res.status(403).send('Forbidden Access')
            const query = { "Donator.DonatorEmail": email }
            const result = await productCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/food-request/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { "donar.donerEmail": email }
            const result = await productRequestCollection.find(query).toArray()
            res.send(result)
        })
        app.delete('/food-requested/:id', async (req, res) => {
            const id = req.params.id
            const query = {
                "donar.foodId": id
            }
            const result = await productRequestCollection.deleteOne(query)
            res.send(result)
        })

        app.post('/food-request', async (req, res) => {
            const body = req.body
            const result = await productRequestCollection.insertOne(body)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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