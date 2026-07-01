const previewContainer = document.getElementById("previewContainer");

document.getElementById("imageInput").addEventListener("change", handleImageUpload);

async function handleImageUpload(event) {
    const files = event.target.files;
    previewContainer.innerHTML = '';

    const widthCM = parseFloat(document.getElementById("widthInput").value);
    const heightCM = parseFloat(document.getElementById("heightInput").value);
    const spaceWidth = parseFloat(document.getElementById("spaceWidthInput").value);
    const spaceHeight = parseFloat(document.getElementById("spaceHeightInput").value);
    const pageSize = document.getElementById("pageSize").value;

    const { jsPDF } = window.jspdf;
    const tempPDF = new jsPDF({ orientation: "portrait", unit: "cm", format: pageSize });
    const pageWidth = tempPDF.internal.pageSize.getWidth();
    const pageHeight = tempPDF.internal.pageSize.getHeight();

    const cols = Math.floor(pageWidth / (widthCM + spaceWidth));
    const rows = Math.floor(pageHeight / (heightCM + spaceHeight));
    const imagesPerPage = cols * rows;

    let currentPage = 1;
    let pageDiv = createNewPagePreview(currentPage);

    for (let i = 0; i < files.length; i++) {
        if (i >= 200) break;

        if (i !== 0 && i % imagesPerPage === 0) {
            currentPage++;
            pageDiv = createNewPagePreview(currentPage);
        }

        const imgData = await resizeImage(files[i]);
        const imgElement = document.createElement("img");
        imgElement.src = imgData;
        imgElement.classList.add("preview-image");

        pageDiv.querySelector('.images-container').appendChild(imgElement);
    }

    updatePreview();
}

function createNewPagePreview(pageNumber) {
    const pageDiv = document.createElement('div');
    pageDiv.classList.add('page-preview');

    const title = document.createElement('div');
    title.classList.add('page-title');
    title.textContent = `Página ${pageNumber}`;

    const imagesDiv = document.createElement('div');
    imagesDiv.classList.add('images-container');

    pageDiv.appendChild(title);
    pageDiv.appendChild(imagesDiv);

    previewContainer.appendChild(pageDiv);

    return pageDiv;
}

async function resizeImage(file) {
    const widthCM = parseFloat(document.getElementById("widthInput").value);
    const heightCM = parseFloat(document.getElementById("heightInput").value);
    const dpi = 96;
    const width = (widthCM / 2.54) * dpi;
    const height = (heightCM / 2.54) * dpi;

    const reader = new FileReader();
    return new Promise((resolve) => {
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 1.0));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function updatePreview() {
    const widthCM = parseFloat(document.getElementById("widthInput").value);
    const heightCM = parseFloat(document.getElementById("heightInput").value);
    const spaceWidth = parseFloat(document.getElementById("spaceWidthInput").value);
    const spaceHeight = parseFloat(document.getElementById("spaceHeightInput").value);

    const images = previewContainer.querySelectorAll('.preview-image');

    images.forEach((img) => {
        img.style.width = `${widthCM}cm`;
        img.style.height = `${heightCM}cm`;
        img.style.marginRight = `${spaceWidth}cm`;
        img.style.marginBottom = `${spaceHeight}cm`;
    });
}

function generarPDF() {
    const { jsPDF } = window.jspdf;
    const files = document.getElementById("imageInput").files;
    const widthCM = parseFloat(document.getElementById("widthInput").value);
    const heightCM = parseFloat(document.getElementById("heightInput").value);
    const spaceWidth = parseFloat(document.getElementById("spaceWidthInput").value);
    const spaceHeight = parseFloat(document.getElementById("spaceHeightInput").value);
    const pageSize = document.getElementById("pageSize").value;

    if (files.length === 0) return alert("Sube al menos una imagen.");
    if (files.length > 200) return alert("Máximo 200 imágenes.");

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "cm",
        format: pageSize,
    });

    const pageDimensions = pdf.internal.pageSize;
    const pageWidth = pageDimensions.getWidth();
    const pageHeight = pageDimensions.getHeight();

    const cols = Math.floor(pageWidth / (widthCM + spaceWidth));
    const rows = Math.floor(pageHeight / (heightCM + spaceHeight));
    const imagesPerPage = cols * rows;

    for (let i = 0; i < files.length; i++) {
        if (i % imagesPerPage === 0 && i !== 0) pdf.addPage();

        const imgData = resizeImage(files[i]);
        imgData.then(data => {
            const positionIndex = i % imagesPerPage;
            const col = positionIndex % cols;
            const row = Math.floor(positionIndex / cols);

            const totalWidthImgs = cols * widthCM + (cols - 1) * spaceWidth;
            const totalHeightImgs = rows * heightCM + (rows - 1) * spaceHeight;

            const startX = (pageWidth - totalWidthImgs) / 2;
            const startY = (pageHeight - totalHeightImgs) / 2;

            const x = startX + col * (widthCM + spaceWidth);
            const y = startY + row * (heightCM + spaceHeight);

            pdf.addImage(data, "JPEG", x, y, widthCM, heightCM);
        });
    }

    pdf.save("Imagenes.pdf");
}
