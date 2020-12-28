//declare variables
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const express = require('express');
const ObjectID = require('mongodb').ObjectID;
const app = express();
const fs = require('fs');
const formidable = require('express-formidable');
const mongourl = 'mongodb+srv://ryik:ry821825@cluster0.uvhsn.mongodb.net/test?retryWrites=true&w=majority';
const dbName = 'test';
const session = require('cookie-session');
const bodyParser = require('body-parser');

app.set('view engine', 'ejs');
const SECRETKEY = 'I want to pass COMPS381F';

app.set('view engine', 'ejs');
app.use(session({
	name: 'loginSession',
	keys: [SECRETKEY]
}));

app.set('view engine', 'ejs');

const checkAccount = (db, criteria, callback) => { //check account exist or not exist in database
    let cursor = db.collection('accounts').find(criteria);
    console.log(`checkAccount: ${JSON.stringify(criteria)}`);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`checkAccount: ${docs.length}`);
        callback(docs);
    });
}

const insertDocument = (db ,doc ,callback) => {
    db.collection('accounts').
    insertOne(doc, (err, result) => {
            assert.equal(err, null);
            console.log("Inserted one document" + JSON.stringify(doc));
            callback();
        });
}

const loginAccount = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err)=> {
        assert.equal(null, err);
        console.log("Logging in");
        const db = client.db(dbName);
        
        checkAccount(db, criteria, (docs) => {
            client.close();
			var n = 0;
			console.log(req.body.password);
            for (var doc of docs) {
                if(doc.id == req.body.username && doc.password == req.body.password){
                    console.log("Correct");
                    req.session.authenticated = true;
                    req.session.username = req.body.id;
                }
            }
            res.redirect('/');
        })
    })
}
    
const regAccount = (req, res, criteria) => { //register account
	const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
		const db = client.db(dbName);

		checkAccount(db, criteria, (docs) => {
		
			var account = false;

			for (var doc of docs) { //check if account is registerd or not

			if(doc.accountId == req.body.username && doc.password == req.body.password){
				account = true;				
            }

			}
			if(account){

                console.log("The account already exists.");  //account exists
                res.redirect('/register');
            }
            else{   
                console.log("Creating new account.");
                insertDocument(db,req.body,()=>{
					client.close();
					console.log("Create successful...");
					res.redirect('/');
                })
            }
        })
    })
}
  
const findRestaurant = (db, criteria, callback) => {
    let cursor = db.collection('restaurants').find(criteria);
    console.log(`findRestaurant: ${JSON.stringify(criteria)}`);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`findRestaurant: ${docs.length}`);
        callback(docs);
    });
}

const listRestaurant = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Listing all known restaurant......");
        const db = client.db(dbName);
        const count = 0;
        findRestaurant(db, criteria, (docs) =>{
            res.status(200).render("index",{Restaurant:docs,userName:req.session.username})
        })
    })
}

const insertRestaurant = (doc, callback) =>{
    const client = new MongoClient(mongourl);
        client.connect((err) => {
        assert.equal(null, err);  
        const db = client.db(dbName);

	db.collection('restaurants').
        insertOne(doc, (err, result) => {
            assert.equal(err, null);
            console.log("Inserted one document " + JSON.stringify(doc));
            callback();
            });       
    })
}

const handle_Insert = (req, res) =>{

    console.log('Inserting New Restaurant...');

    var docData = {};
    docData.id = req.fields.id ;
    docData.name = req.fields.name ;
    docData.borough = req.fields.borough ;
    docData.cuisine = req.fields.cuisine ;
    
    if (req.files.image.size > 0) {
        fs.readFile(req.files.image.path, (err,data) => {
            assert.equal(err,null);
            docData.image = {};
                docData.image.type = new Buffer.from(data).toString('base64');
                docData.image.mimeType = req.files.image.type;
        });
    }    
     
    docData.address = {} ;
    docData.address.street = req.fields.street ;
    docData.address.building = req.fields.building ;
    docData.address.zipcode = req.fields.zipcode ;
    docData.address.coord = req.fields.coord ;
    docData.owner = req.fields.owner ;
    docData.grades = [];
    console.log(docData);
        insertRestaurant(docData,()=>{
            console.log("Insert successful......");
            res.redirect('/index');
        })
}

const displayDetails = (req, res, criteria) =>{

	const client = new MongoClient(mongourl);
	client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
		let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id);
        findRestaurant (db, DOCID, (docs)=>{
			let resGrades = false;
			if( docs[0].grades.length > 0){
				
				for (var doc of docs[0].grades) {
				
				console.log(doc.user);
					if(doc.user == req.session.username){
                        resGrades = true;
                    }
                    console.log(resGrades);
                }
            }
            res.status(200).render('rating',{doc:req.query,userName:req.session.username,resGrades:resGrades});
        })
    })
}

const scoreRestaurant = (criteria, addDoc, callback) =>{

	const client = new MongoClient(mongourl);
	client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
		const db = client.db(dbName);
            db.collection('restaurants').updateOne(criteria,
                {
                    $push : addDoc
                },
                (err, results) => {
                    client.close();
                    assert.equal(err, null);
                    callback(results);
                }
            );
    })
}

const gradeRestaurant = (req, res, criteria) =>{

	const client = new MongoClient(mongourl);
	client.connect((err) => {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    const db = client.db(dbName);

    var docData = {};
    docData.grades = {};
    docData.grades.user = req.fields.user ;
    docData.grades.score = req.fields.score;
    console.log(docData);
    let DOCID = {};
    DOCID['_id'] = ObjectID(criteria._id);
    scoreRestaurant(DOCID, docData, (resGrades)=>{
        console.log("Grade was added......");
		console.log(resGrades.result.nModified);
        res.redirect('/index');
        })
    })
}

const deleteRestaurant = (doc, callback) =>{

    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
    db.collection('restaurants').deleteOne(doc, (err,result) => {
        assert.equal(err,null);
        console.log('deleteOne' + JSON.stringify(doc));
        callback();
        });
    })
}

const handle_Delete = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id);
        deleteRestaurant(DOCID => {
            console.log("Delete successful");
            res.redirect('/index');
        })
    })
}

const handle_Edit = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id);
        findRestaurant(db, DOCID, (docData) => {
            res.status(200).render('edit',{restaurants: docData, userName:req.session.username})
        })
    })
}

const updateRestaurant = (criteria, updateDoc , callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('restaurants').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Update = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

	    let DOCID = {};
	    DOCID['_id'] = ObjectID(criteria._id);

        console.log("Updating document......");
        var newDocData = {};
        newDocData.id = req.fields.id ;
        newDocData.name = req.fields.name ;
        newDocData.borough = req.fields.borough ;
        newDocData.cuisine = req.fields.cuisine ;

        if (req.files.image.size > 0) {
            fs.readFile(req.files.image.path, (err,data) => {
                assert.equal(err,null);
                newDocData.image = {};
                    newDocData.image.type = new Buffer.from(data).toString('base64');
                    newDocData.image.mimeType = req.files.image.type;
            })
        } 
        
        newDocData.address = {} ;
        newDocData.address.street = req.fields.street ;
        newDocData.address.building = req.fields.building ;
        newDocData.address.zipcode = req.fields.zipcode ;
        newDocData.address.coord = req.fields.coord ;
        newDocData.address.owner = req.fields.owner ;

        console.log(newDocData);
        updateRestaurant(DOCID, newDocData,(results)=>{
            console.log("Insert successful......");
            res.redirect('/index');         
        })
    })
}

const showMoreDetails =(req, res,criteria) =>{
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
		var collection = db.collection('restaurants');
		
		let DOCID = {};
		DOCID['_id'] = ObjectID(criteria._id);
		
            findRestaurant (db, DOCID, (docs)=>{
				console.log(docs);
				res.status(200).render('details',{datadoc:docs[0]})
				

        })
    })

}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//handle output requests
app.get('/', (req,res) => {
    if(req.session.authenticated){
        console.log('Processing to next page......')
        res.redirect('/index');
        }
        else{
            res.redirect('/login');
        }
    
});

app.get('/login' , (req,res) =>{
    res.status(200).render('login', {});
});

app.post('/login', (req,res)=>{
    console.log("Logging in");
    loginAccount(req, res, req.query);
});

app.get('/register', (req, res)=>{ 
    res.status(200).render('register', {}); 
}); 

app.post('/register', (req,res)=>{
    regAccount(req, res, req.query);
});

app.get('/index', (req,res)=>{
    listRestaurant(req, res, req.query);
});



app.use(formidable());
app.set('view engine', 'ejs');

app.get('/create',(req,res) =>{
	res.status(200).render('create',{userName:req.session.username});
});

app.post('/create',(req,res) =>{
	handle_Insert(req,res);
})

app.get('/details',(req,res) =>{
    showMoreDetails(req, res, req.query);
});

app.get('/delete',(req,res) =>{
	handle_Delete(req,res,req.query);
});


app.get('/edit',(req,res) =>{
    handle_Edit(req,res,req.query);
});

app.post('/update',(req,res) =>{
    handle_Update(req.res,req.query);
});

app.get('/rating',(req,res) =>{
	displayDetails(req,res,req.query);
});

app.post('/rating',(req,res) =>{
    gradeRestaurant(req,res, req.query);
})

app.get('/logout', (req,res)=>{
    req.session = null; 
    res.redirect('/');
});

app.listen(process.env.PORT || 8099 );