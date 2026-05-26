const { z } = require('zod');
const aiService = require('./ai.service');
const llmService = require('../../services/llm.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000)
});

const chat = async (req, res, next) => {
  try {
    const { message } = chatSchema.parse(req.body);
    const result = await aiService.processChat(message, req.user);

    const io = req.app.getIO();
    if (io) {
      io.to(`ai:${req.user.id}`).emit('ai:response', {
        userId: req.user.id,
        query: message,
        response: result.response,
        timestamp: new Date()
      });
    }

    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Validation failed', error.errors, 400);
    }
    if (error.status && error.code) {
      return sendError(res, error.code, error.message, null, error.status);
    }
    next(error);
  }
};

const suggestions = async (req, res, next) => {
  try {
    const prompts = aiService.getSuggestions(req.user.role);
    return sendSuccess(res, { suggestions: prompts });
  } catch (error) {
    next(error);
  }
};

const health = async (req, res, next) => {
  try {
    const status = await llmService.health();
    return sendSuccess(res, status);
  } catch (error) {
    next(error);
  }
};

module.exports = { chat, suggestions, health };
