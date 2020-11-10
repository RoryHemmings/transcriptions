 async function generatePDFs() {
   pdfjsLib.disableWorker = true;

   let previews = document.getElementsByClassName('pdf-thumbnail');

   for (let i = 0; i < previews.length; i++) {
     const path = previews[i].getAttribute('pdf-path');

     pdfjsLib.getDocument(path).promise
       .then((pdf) => {
         pdf.getPage(1).then((page) => {
           let canvas = document.createElement('canvas');
           let viewport = page.getViewport({
             scale: 1.0
           });
           let context = canvas.getContext('2d');

           canvas.width = 200;
           canvas.height = 258;

           const scale = Math.min(canvas.width / viewport.width, canvas.height / viewport.height);

           page.render({
             canvasContext: context,
             viewport: page.getViewport({
               scale: scale
             })
           }).promise.then(() => {
             previews[i].src = canvas.toDataURL();
           });
         }).catch((err) => {
           console.log(err)
           // console.log(`Could not open page 1 of document ${path}`);
         });
       });
   }
 }

 document.addEventListener('DOMContentLoaded', () => {
   generatePDFs();
 });