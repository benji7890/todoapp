# Unclear Requirements

## Questions
1. Who are the intended users? 
2. What will users be using the basic upload file functionality for? Uploading images? Uploading large files?
3. Do users prefer a simple upload button or a drag and drop feature?
4. Is this upload feature embedded within the Todo app? For example: You can upload a PDF or word doc, it can be parsed and made into a todo list
5. what are the MIME file types allowed or not allowed?
6. What are the max file upload size?
7. Multer is only needed when you want to actually receive and store file bytes on the server's filesystem. Your current tRPC-based approach is simpler and sufficient for metadata storage.