import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";

export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
      }
      Variables: {
        userId: string;
      }
}>();
//all the blog routes need to be authenticated so we will we writing a middleware wchich will check authentication for us.

blogRouter.use("/*",async (c,next)=>{
    //check is user is logged in
    const authHeader =  c.req.header('authorization') || '';
    if(!authHeader){
        c.status(401);
        return c.json({
            error:"unauthorized"
        })
    }
    
    const user: any = await verify(authHeader,c.env.JWT_SECRET);
    if(user){
        //c is context which have all the iinformation about the request and also we can manually store data in this context
        c.set('userId',user.id);
        await next();
    }else{
        c.status(403); 
        c.json({
            message: 'you are not logged in'
        })
    }
    //extract the userid and pass it to route handler
})
  
  blogRouter.post ('/',async (c)=>{
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
      }).$extends(withAccelerate());
      const body =await c.req.json();
      const authorId = c.get('userId');   
    const blog =  await prisma.blog.create({
        data:{
            title: body.title,
            content: body.content,
            authorId: Number(authorId)
        }
      })
      return c.json({
        id: Number(blog.id),
      })
  })



  blogRouter.put ('/', async (c)=>{
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());
    const body = await c.req.json();
   const blog =  await prisma.blog.update({
        where :  {
            //blogid
            id: body.id,
        },
        data: {
            title: body.title,
            content: body.content,
        }
    })
  return c.json({
    id: blog.id
  })
  })

  //add pagination
  blogRouter.get ('/bulk',async (c)=>{
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());
    try{

        const blogs = await prisma.blog.findMany();
        return c.json({
            blogs: blogs
        })
    }catch(err){
        return c.text('failed to fetch bulk blogs')
    }
  })

  blogRouter.get ('/:id',async (c)=>{
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());
    const blogId = c.req.param('id');
    try{
        const blog = await prisma.blog.findFirst({
            where: {
                id: Number(blogId)  //here we need to get the id from routes
            }
        })
        c.status(200);
        return c.json({
blog: blog
        })
    }catch(err){
        c.status(411);
        return c.text('failed to fetch the blog')
    }
  
  })

  