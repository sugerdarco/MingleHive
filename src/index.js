import connectDB from "./db/connection.js";
import {app} from "./app.js";
import dotenv from 'dotenv';

dotenv.config({path: ".env"});

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server started on port ${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection Failure ", err);
    })

