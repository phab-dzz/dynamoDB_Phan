const express = require("express")
require('dotenv').config()
const app = express();
let subjects = require('./data'); // Thay đổi từ const thành let để có thể gán lại giá trị
const path = require('path')
const {v4: uuid} = require('uuid')
app.use(express.json({extended: false}))
app.use(express.static('./views'))
app.set('view engine', 'ejs')
app.set('views', './views')
app.use(express.urlencoded({ extended: true })); // Thêm dòng này
 const multer = require('multer');
 const upload = multer( );
const { table } = require("console");
const AWS=require('aws-sdk')
const config= new AWS.Config({
    accessKeyId:process.env.ACCESSKEYID,
    secretAccessKey:process.env.SECRETACCESSKEY,
    region:process.env.REGION
})
const docClient = new AWS.DynamoDB.DocumentClient(config)
const TableName = 'KhoaHoc'
app.get('/', (request, response) => {	
    const params = {
        TableName: TableName
    }
    docClient.scan(params, function(err, data){
        if(err){
            console.log(err)
            return response.send('Error')
        }else{
            console.log(data)
            return response.render('index', {subjects: data.Items})
        }
    }
    )
})



//  const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, '')
//     },
//     filename: function (req, file, cb) {
//       cb(null, file.originalname)
//     },
//   })
 
// function checkFileType(file, cb) {
//     const filetypes = /jpeg|jpg|png|gif/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
//     if (mimetype && extname) {
//       return cb(null, true);
//     } else {
//      return cb('Error: Images Only!');
//     }
//   }

//   const upload = multer({ storage: storage ,limits: { fileSize: 1000000 },
//     fileFilter: function (req, file, cb) {
//       checkFileType(file, cb);
//     }}).single('image')




// app.get('/',upload.single('image'), (request, response) => {
//     const {id,name,type,semester,department} = request.body
//     const image = request.file.originalname.split('.');
//     const imageType = image[image.length-1]
//     const filePath = `./public/images/${uuid()}.${imageType}`
//     const params={
//         Bucket: 'bucket-name',
//         Key: 'image.jpg',
//         Body:request.file.buffer,

//     }
//     s3.upload(params, function(err, data) {
//        if(err) {
//            console.log(err)
//            return response.send('Error uploading file')
//        }else{
//         const newItem={
//             TableName:TableName,
//             Item:{
//                 id:uuid(),
//                 name:name,
//                 type:type,
//                 semester:semester,
//                 department:department,
//                 image:data.Location
//             }
//         }
//         docClient.put(newItem, function(err,data){
//             if(err){
//                 console.log(err)
//                 return response.send('Error uploading file')
//             }else{
//                 console.log(data)
//                 return response.redirect('/')
//             }
//         })
//        }

//     });
// })

app.post('/save',upload.fields([]), (request, response) => {
    console.log("Body nhận được:", request.body);
    const id = Number(request.body.id);
    const name = request.body.name;
    const type = request.body.type;
    const semester = request.body.semester;
    const department = request.body.department;
    
    console.log("Sau khi xử lý:", { id, name, type, semester, department });
    console.log("ID có phải là số hợp lệ:", !isNaN(id));
    
    if (!id || !name || !type || !semester || !department) {
        console.log("Trường thiếu:", {
            id: !id,
            name: !name,
            type: !type,
            semester: !semester,
            department: !department
        });
        console.log("Thiếu dữ liệu đầu vào!");
        return response.redirect('/');
    }
    const params = { TableName:TableName ,Item:{
        "id":id,
       "name":  name,
       "type": type,
       "semester": semester,
       "department": department 
    }
    };
    docClient.put(params, function(err, data){
        if(err){
            console.log(err)
            return response.send('Error')
        }else{
            console.log(data)
            console.log("Thêm môn học thành công:",)
            return response.redirect('/')

        }
    }
    )
    // console.log("Thêm môn học thành công:", params);
    // return response.redirect('/');
    // Phần code còn lại...
});

// app.post('/delete', (request, response) => {

//     const selectedIds = Array.isArray(request.body.selectedSubjects) 
//         ? request.body.selectedSubjects 
//         : [request.body.selectedSubjects];
    
//     if (!selectedIds || selectedIds.length <= 0) {
//         return response.redirect('/');
//     }

//     // Chuyển đổi các ID thành số
//     const idsToDelete = selectedIds.map(id => Number(id));
    
//     // // Lọc ra các môn học cần giữ lại
//     // subjects = subjects.filter(item => !idsToDelete.includes(item.id));
//     console.log("ID cần xóa:", idsToDelete);
//     const params = {
//         TableName: TableName,
//         Key:{
//             "id": idsToDelete
//         }
//     }
//     docClient.delete(params, function(err, data){
//         if(err){
//             console.log(err)
//             return response.send('Error')
//         }else{
//             console.log(data)
//             console.log("Xóa môn học thành công:", idsToDelete);
//             return response.redirect('/')
//         }
//     }
//     )

// });

app.post('/delete', async (request, response) => {
    const selectedIds = Array.isArray(request.body.selectedSubjects) 
        ? request.body.selectedSubjects 
        : [request.body.selectedSubjects];

    if (!selectedIds || selectedIds.length <= 0) {
        return response.redirect('/');
    }

    // Chuyển đổi ID sang kiểu số nếu cần
    const idsToDelete = selectedIds.map(id => Number(id));

    console.log("ID cần xóa:", idsToDelete);

    try {
        for (let id of idsToDelete) {
            const params = {
                TableName: TableName,
                Key: { "id": id } // Xóa từng ID một
            };

            await docClient.delete(params).promise();
            console.log("Đã xóa môn học:", id);
        }

        return response.redirect('/');
    } catch (err) {
        console.error("Lỗi khi xóa:", err);
        return response.send('Error');
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000!')
})