"use strict";
// const changePassword = async (req, res) => {
//     const { USER_ID, CURRENT_PASSWORD, PASSWORD } = req.body;
//     // Géstion d'erreur de toute la méthode
//     const passwordSchema = yup.lazy(() => yup.object({
//         USER_ID: yup.number().required(),
//         CURRENT_PASSWORD: yup.string().required(),
//         PASSWORD: yup.string().required().min(8),
//         CONFIRM_PASSWORD: yup.string().required().oneOf([yup.ref('PASSWORD'), null], 'Passwords must match'),
//     }));
//     // Géstion d'erreur de validation des données
//     try {
//         passwordSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
//     } catch (ex) {
//         return res.status(422).json({
//             httpStatus: 422,
//             message: 'Erreur de validation des données',
//             data: null,
//             errors: ex.inner.reduce((acc, curr) => {
//                 if (curr.path) {
//                     return { ...acc, [curr.path]: curr.errors[0] }
//                 }
//             }, {}),
//         })
//     }
//     // Géstion d'erreur d'insertion des données
//     try {
//         const utilisateur = await UtilisateurModel.findByPk(USER_ID);
//         if (!utilisateur) {
//             return res.status(404).json({
//                 httpStatus: 404,
//                 message: "Utilisateur non trouvé",
//                 data: null
//             })
//         }
//         // const salt = await bcrypt.genSalt(10)
//         // const PASSWORD = await bcrypt.hash(req.body.CURRENT_PASSWORD, salt)
//         if (!(await bcrypt.compare(CURRENT_PASSWORD, utilisateur.PASSWORD))) {
//             return res.status(422).json({
//                 httpStatus: 422,
//                 message: "Erreur de validation des données",
//                 data: null,
//                 errors: { CURRENT_PASSWORD: "Mauvais mot de passe fourni" }
//             })
//         }
//         const salt = await bcrypt.genSalt(10)
//         const NEW_PASSWORD = await bcrypt.hash(PASSWORD, salt)
//         await Utilisateur.update(
//             { PASSWORD: NEW_PASSWORD },
//             { where: { USER_ID: req.body.USER_ID } }
//         );
//         res.status(200).json({
//             httpStatus: 201,
//             message: 'Mot passe changé avec succès',
//             data: null
//         });
//     } catch (error) {
//         res.status(500).json({
//             message: 'Erreur interne du serveur',
//             httpStatus: 500,
//             data: null
//         })
//     }
// }
