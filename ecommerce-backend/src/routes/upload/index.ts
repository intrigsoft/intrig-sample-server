import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import multer from 'fastify-multer';
import * as fs from 'fs';
// import * as path from 'path';

export const uploadRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register multer as a plugin
  fastify.register(multer.contentParser);

  // Configure Multer storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'data/uploads/';
      console.log(uploadDir);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir); // Specify upload directory
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName); // Generate a unique file name
    },
  });

  const upload = multer({ storage });

  // File upload endpoint
  fastify.post('/file', {
    schema: {
      description: 'Upload a file',
      tags: ['Upload'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          file: { type: 'string', format: 'binary', description: 'File to upload' },
        },
        required: ['file'],
      },
      response: {
        200: {
          description: 'File uploaded successfully',
          type: 'object',
          properties: {
            message: { type: 'string' },
            filePath: { type: 'string' },
          },
        },
      },
    },
    preHandler: upload.single('file'), // Use multer's `single` for single file upload
    validatorCompiler: () => () => true
  }, async (request, reply) => {
    const file = (request as any).file; // Multer adds `file` property to the request

    if (!file) {
      return reply.status(400).send({ message: 'No file uploaded' });
    }

    reply.send({
      message: 'File uploaded successfully',
      filePath: `/uploads/${file.filename}`,
    });
  });

  // Serve uploaded files
  fastify.get('/uploads/:filename', {
    schema: {
      description: 'Get an uploaded file',
      tags: ['Upload'],
      params: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Name of the uploaded file' },
        },
        required: ['filename'],
      },
      response: {
        200: {
          description: 'File retrieved successfully',
          type: 'string',
          format: 'binary',
        },
      },
    },
  }, async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const filePath = `data/uploads/${filename}`;

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ message: 'File not found' });
    }

    return reply.sendFile(filename); // Requires `fastify-static` if not already set up
  });
};

export default uploadRoutes;
