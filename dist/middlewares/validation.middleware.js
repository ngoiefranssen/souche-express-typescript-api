"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            console.log('Données reçues:', {
                body: req.body,
                query: req.query,
                params: req.params,
            });
            const validated = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // Stocker les données validées
            req.validated = validated;
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation échouée',
                    errors: error.issues.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            return next(error);
        }
    };
};
exports.validate = validate;
