const express = require("express")
require('dotenv').config()
const app = express();
let subjects = require('./data'); 
const path = require('path')
const {on} = require('events')

const {v4: uuid} = require('uuid')
app.use(express.json({extended: false}))
app.use(express.static('./views'))
const bodyParser = require('body-parser');
const AWS=require('aws-sdk')
const config= new AWS.Config({
    accessKeyId:process.env.ACCESSKEYID,
    secretAccessKey:process.env.SECRETACCESSKEY,
    region:process.env.REGION
})
const s3 = new AWS.S3(config)
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs')
app.set('views', './views')


app.use(express.urlencoded({ extended: true })); // Thêm dòng này
 const multer = require('multer');

const { table } = require("console");

const docClient = new AWS.DynamoDB.DocumentClient(config)
const TableName = 'KhoaHoc'
app.get('/', async (request, response) => {	
    try {
        const params = { TableName: TableName };
        const data = await docClient.scan(params).promise();
        console.log(data);
        return response.render('index', { subjects: data.Items });
    } catch (err) {
        console.error(err);
        return response.send('Error');
    }
});
const storage = multer.memoryStorage({
    destination:function(req,file,cb){
        cb(null,'')
    },
})



function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
     return cb('Error: Images Only!');
    }
  }

  const upload = multer({ storage: storage ,limits: { fileSize: 1000000 },
    fileFilter: function (req, file, cb) {
      checkFileType(file, cb);
    }})





app.post('/save',upload.single('image'), (request, response) => {
    try{
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
    const image =request.file?.originalname.split('.');
    const imageType = image[image.length-1]
    const filePath = `${id}_${new Date().getTime()}.${imageType}`
    const paramsS3={
        Bucket: 'phan21101491-s3-cnm',
        Key: filePath,
        Body:request.file.buffer,
        ContentType: request.file.mimetype
    }

    s3.upload(paramsS3, async function(err, data) {
        if (err) {
            console.error('Error uploading image to S3', err);
            return response.status(500).json({ message: 'Internal Server Error' });
        } else {
            const imageURL = data.Location; // gán URL S3 vào đường dẫn image
            const params = {
                TableName: TableName,
                Item: {
                    id: id,
                    name: name,
                    type: type,
                    semester: semester,
                    department: department,
                    image: imageURL,
                },
            };
      
            await docClient.put(params).promise(); // lưu dữ liệu vào bảng
            response.redirect('/'); // redirect về trang chủ
        }
    });
} catch (error) {
    console.error('Error saving data to DynamoDb', error);
    return response.status(500).json({ message: 'Internal Server Error' });
}
});


app.post('/delete',upload.fields([]), async (request, response) => {
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