const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ngf1b.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const itemsCollection = client.db("carWarhouse").collection("itemList");
        const blogsCollection = client.db("carWarhouse").collection("blogs");

        // auth
        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        })

        // items api
        // get items
        app.get('/items', async (req, res) => {
            const query = {};
            const cursor = itemsCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        });

        // get blogs
        app.get('/blogs', async (req, res) => {
            const query = {};
            const cursor = blogsCollection.find(query);
            const blogs = await cursor.toArray();
            res.send(blogs);
        });

        // get item by id
        app.get('/items/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const item = await itemsCollection.findOne(query);
            res.send(item);
        });

        // update item
        app.put('/items/:id', async (req, res) => {
            const id = req.params.id;
            const updatedItem = req.body;
            const filter = {_id: ObjectId(id)};
            const options = {upsert: true};
            const updatedData = {
                $set: {
                    quantity: updatedItem.quantity
                }
            };
            const result = await itemsCollection.updateOne(filter, updatedData, options);
            res.send(result);
        });

        // get user added item
        app.get('/addedItems', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            // console.log(email);
            if (decodedEmail === email) {
                const query = { email: email };
                const cursor = itemsCollection.find(query);
                const userAddedItems = await cursor.toArray();
                res.send(userAddedItems);
            }
            else{
                res.status(403).send({ message: 'Forbidden access' });
            }
        });

        // add item
        app.post('/addedItems', async (req, res) => {
            const newItem = req.body;
            const result = await itemsCollection.insertOne(newItem);
            res.send(result);
        });

        // delete item
        app.delete('/items/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await itemsCollection.deleteOne(query);
            res.send(result);
        });

    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server is running');
})

app.listen(port, () => {
    console.log('Listening to port, ', port);
})