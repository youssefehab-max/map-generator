import{Request,Response} from "express"

export const uploadImage = async(req:Request, res:Response) => {

    try {

        if(!req.file){
            res.status(400).json({
                
                status:400,
                success: false,
                message: "No file uploaded !"
            })
            return
        }



        res.status(200).json({

            status:200,
            success: true,
            message: "File uploaded successfully!",
            imageUrl: req.file?.path
        })

        console.log("File url: ",req.file?.path)
        console.log("File Public ID: ",req.file?.filename)
        
    } catch (error) {
        res.status(500).json({

            status: 500,
            success:false,
            message:"failed to upload image",
            error: error instanceof Error ? error.message : error
        })
        console.log(error instanceof Error ? error.message : error)

        return 
    }
}