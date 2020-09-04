const app = require('./index');
app.listen(process.env.PORT, () =>
    console.log(`App is listening on port: ${process.env.PORT}`)
);