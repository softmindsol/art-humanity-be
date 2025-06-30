// validation/userValidation.js
import Joi from 'joi';

const userValidationSchema = Joi.object({
    fullName: Joi.string()
        .min(3)
        .max(30)
        .required()
        .trim(),
    
    email: Joi.string()
        .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org'] } })
        .required()
        .trim(),
    
    password: Joi.string()
        .min(6)
        .required(),
    
   
});

export const validateUser = (data) => {
    return userValidationSchema.validate(data);
};