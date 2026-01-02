import express from 'express';
import { upload, s3 } from '../config/aws';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Test PDF endpoint
router.get('/test-pdf', (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  res.send('PDF test endpoint working');
});

// List S3 files for debugging
router.get('/list-files', (req, res) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      MaxKeys: 10
    };
    
    s3.listObjectsV2(params, (err: any, data: any) => {
      if (err) {
        console.error('List files error:', err);
        return res.status(500).json({ error: 'Failed to list files', details: err.message });
      }
      
      res.json({
        success: true,
        files: data.Contents?.map((obj: any) => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified
        })) || []
      });
    });
    
  } catch (error) {
    console.error('List files error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to list files', details: errorMessage });
  }
});

router.post('/upload', (req, res, next) => {
  console.log('=== UPLOAD REQUEST START ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  next();
}, upload.single('file'), (req, res) => {
  try {
    console.log('Upload request received');
    console.log('File:', req.file ? 'Present' : 'Missing');
    console.log('Body:', req.body);

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file as any; // multer-s3 adds additional properties
    console.log('File uploaded successfully:', file.key);
    
    res.json({
      success: true,
      file: {
        filename: file.originalname,
        url: file.location,
        key: file.key,
        size: file.size,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Upload failed', details: errorMessage });
  }
});

// Serve PDF files with proper headers
router.get('/pdf/*', (req, res) => {
  try {
    // Get the full path after /pdf/
    const key = (req.params as any)[0];
    console.log('PDF request for key:', key);
    
    if (!key) {
      return res.status(400).json({ error: 'No file key provided' });
    }
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: decodeURIComponent(key)
    };
    
    console.log('S3 params:', params);
    
    // Get the file from S3 and pipe it to response
    const stream = s3.getObject(params).createReadStream();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    stream.pipe(res);
    
    stream.on('error', (error: any) => {
      console.error('PDF stream error:', error);
      res.status(404).json({ error: 'PDF not found', details: error.message });
    });
    
  } catch (error) {
    console.error('PDF serve error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to serve PDF', details: errorMessage });
  }
});

// Get file URL (for private files)
router.get('/file/:key', (req, res) => {
  try {
    const { key } = req.params;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Expires: 3600 // URL expires in 1 hour
    };
    
    const url = s3.getSignedUrl('getObject', params);
    res.json({ url });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file URL' });
  }
});

// Delete file
router.delete('/file/*', (req, res) => {
  try {
    // Get the full path after /file/
    const key = (req.params as any)[0];
    console.log('Delete request received for key:', key);
    
    if (!key) {
      console.log('No key provided in delete request');
      return res.status(400).json({ error: 'No file key provided' });
    }
    
    // Decode the key properly
    const decodedKey = decodeURIComponent(key);
    console.log('Decoded key:', decodedKey);
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: decodedKey
    };
    
    console.log('Attempting to delete from S3 with params:', params);
    
    s3.deleteObject(params, (err: any) => {
      if (err) {
        console.error('S3 Delete error:', err);
        return res.status(500).json({ 
          error: 'Failed to delete file from S3', 
          details: err.message,
          code: err.code 
        });
      }
      console.log('File deleted successfully from S3:', decodedKey);
      res.json({ success: true, message: 'File deleted successfully' });
    });
  } catch (error) {
    console.error('Delete file error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to delete file', details: errorMessage });
  }
});

export default router;
