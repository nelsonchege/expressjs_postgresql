require('dotenv').config()

const express = require('express');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt');
const app     = express();

const pool    = require('./db');


app.use(express.json())


// signup
app.post("/signup",async(req,res)=>{
    try{
        const {username,email,password} = req.body
        const salt = await bcrypt.genSalt()
        const hashedPassword = await bcrypt.hash(password,salt)
        const newUser = await pool.query("INSERT INTO Users (username,email,password) VALUES ($1, $2, $3) RETURNING *",[username,email,hashedPassword]);
        res.json(newUser)
    }catch(err){
        console.error(err.message)
    }
});


//login in
app.post("/login",async(req,res)=>{
    try{
        const user = await pool.query("SELECT * FROM Users WHERE username = $1",[req.body.username]);
        const{username,password} = user.rows[0]
        if(await bcrypt.compare(req.body.password,password)){
            const accessToken = jwt.sign(username, process.env.ACCESS_TOKEN_SECRET)
            res.json({accessToken:accessToken})
        }else{
            res.send('wrong details')
        }  
    }catch(err){
        console.error(err.message)
    }
});


// creating a new todo
app.post("/todos",authenticateToken,async(req,res)=>{
    try{
        const {description} = req.body;
        const newTodo = await pool.query("INSERT INTO todo (description) VALUES ($1) RETURNING *",[description]);
        res.json(newTodo)
    }catch(err){
        console.error(err.message)
    }
});


// getting all the todos
app.get("/todos",authenticateToken, async(req,res)=>{
    try{
        const allTodos = await pool.query("SELECT * FROM todo");
        res.json(allTodos);
    }catch(err){
        console.error(err.message)
    }
});


// getting a single todo
app.get("/todo/:id", authenticateToken,async(req,res)=>{
    const {id} = req.params;
    try{
        const singleTodo = await pool.query("SELECT * FROM todo WHERE todo_id = $1",[id]);
        const{todo_id} =singleTodo.rows[0]
        res.json(todo_id);
    }catch(err){
        console.error(err.message)
    }
});


// updating a todo
app.put("/todo/:id",authenticateToken, async(req,res)=>{
    const {id} = req.params;
    const {description} = req.body;
    try{
        const updateTodo = await pool.query("UPDATE todo SET description = $1 WHERE todo_id = $2",[description,id]);
        res.json(updateTodo.rows)
    }catch(err){
        console.error(err.message)
    }
});


// deleting a todo
app.delete("/todo/:id",authenticateToken, async(req,res)=>{
    const {id} = req.params;
    try{
        const deleteTodo = await pool.query("DELETE FROM todo WHERE todo_id = $1",[id])
        res.json({"message":"deleted the todo"})
    }catch(err){
        console.error(err.message)
    }
});


// a verification middleware
function authenticateToken(req,res,next){
    const authHeader = req.headers['authorization']
    const token      = authHeader && authHeader.split(' ')[1]
    if (token == null){return res.sendStatus(401)}

    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,user)=>{
        if(err){return res.json({message:"dont have an account"})}
        req.user = user
        next()
    })
}

//  listening to a port 
app.listen(3001,()=>{
    console.log('listening .........')
});