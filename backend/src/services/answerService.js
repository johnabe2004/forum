import Question from "../models/Question.js";
import Answer from "../models/Answer.js";

const createAnswerService = async ({ questionId, userId, content }) => {
 


  const question = await Question.findById(questionId);

  if (!question) {
   

    const error = new Error("Question not found.");

    
   
    error.statusCode = 404;

    

    throw error;
  }

  if (question.author.id === userId) {

     const error = new Error("You cannot answer your own question.");

 
    error.statusCode = 400;

    
    throw error;
  }

  const answerId = await Answer.create({

     questionId: question.id,

      userId,

   
    content,
  });
 return Answer.findById(answerId);
};


const updateAnswerService = async ({ answerId, userId, content }) => {
 
  
  const answer = await Answer.findById(answerId);

  
  if (!answer) {
    
    
    
    const error = new Error("Answer not found.");

   
    error.statusCode = 404;

  

    throw error;
  }

   if (Number(answer.userId) !== Number(userId)) {
    
    const error = new Error("You can only edit your own answer.");

   
    error.statusCode = 403;

   
    throw error;
  }

   return Answer.updateOwned(answerId, userId, content);
};


const deleteAnswerService = async ({ answerId, userId }) => {
 
  const answer = await Answer.findById(answerId);


  if (!answer) {
    const error = new Error("Answer not found.");

   
    error.statusCode = 404;

   
    throw error;
  }


   
  if (Number(answer.userId) !== Number(userId)) {
  
    const error = new Error("You can only delete your own answer.");

    
    error.statusCode = 403;

    throw error;
  }


  await Answer.deleteOwned(answerId, userId);
};

export { createAnswerService, deleteAnswerService, updateAnswerService };