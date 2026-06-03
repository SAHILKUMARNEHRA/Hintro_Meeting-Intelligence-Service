const { AppError } = require('./errorHandler');

function formatZodIssues(error) {
  return error.issues
    .map((i) => {
      const path = i.path && i.path.length ? i.path.join('.') : '';
      return path ? `${path}: ${i.message}` : i.message;
    })
    .join(', ');
}

function validatePart(schema, partSelector) {
  return (req, res, next) => {
    const input = partSelector(req);
    const result = schema.safeParse(input);
    if (!result.success) {
      return next(
        new AppError('VALIDATION_ERROR', formatZodIssues(result.error), 400),
      );
    }
    Object.assign(input, result.data);
    next();
  };
}

function validateBody(schema) {
  return validatePart(schema, (req) => req.body);
}

function validateQuery(schema) {
  return validatePart(schema, (req) => req.query);
}

function validateParams(schema) {
  return validatePart(schema, (req) => req.params);
}

module.exports = { validateBody, validateQuery, validateParams };

