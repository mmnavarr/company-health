import { app } from "./api";

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Company health API running at http://localhost:${port}`);
});
