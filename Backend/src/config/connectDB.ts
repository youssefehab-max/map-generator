import mongoose from "mongoose"

export const connectDB = async () => {

    try{
       await mongoose.connect(process.env.MONGO_URL as string)
        console.log("connected to mongo")
    }catch(err){

        console.error(err)
        process.exit(1)
    }
}