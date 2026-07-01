const pagePaper = document.getElementById("pagePaper");
const pageContent = document.getElementById("pageContent");
const pageTitle = document.getElementById("pageTitle");
const imageInput = document.getElementById("imageInput");
const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
const setupPageSizeSelect = document.getElementById("setupPageSize");
const pageSizeSelect = setupPageSizeSelect;
const startEditorButton = document.getElementById("startEditorButton");
const setupModal = document.getElementById("setupModal");
const deleteImageButton = document.getElementById("deleteImageButton");
const addPageButton = document.getElementById("addPageButton");
const removePageButton = document.getElementById("removePageButton");
const printButton = document.getElementById("printButton");
const pageNav = document.getElementById("pageNav");

const state = {
    pages: [{
        id: createId(),
        title: "Página 1",
        images: [],
    }],
    activePageId: null,
    selectedImageId: null,
    pageWidthCm: 21,
    pageHeightCm: 29.7,
    scalePxPerCm: 1,
    drag: null,
};

imageInput.addEventListener("change", handleImageUpload);

startEditorButton.addEventListener("click", () => {
    pageSizeSelect.value = setupPageSizeSelect.value;
    const dimensions = getPageDimensions(pageSizeSelect.value);
    state.pageWidthCm = dimensions.width;
    state.pageHeightCm = dimensions.height;
    setupModal.style.display = "none";
    renderImages();
});

function addPage() {
    const newPage = {
        id: createId(),
        title: `Página ${state.pages.length + 1}`,
        images: [],
    };

    state.pages.push(newPage);
    syncPageTitles();
    state.activePageId = newPage.id;
    state.selectedImageId = null;
    renderPageNav();
    renderImages();
}

function setActivePage(pageId) {
    state.activePageId = pageId;
    state.selectedImageId = null;
    renderPageNav();
    renderImages();
}

function removeActivePage() {
    if (state.pages.length <= 1) {
        return alert("Debes conservar al menos una página.");
    }

    const currentIndex = state.pages.findIndex((page) => page.id === state.activePageId);
    const nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;

    state.pages = state.pages.filter((page) => page.id !== state.activePageId);
    syncPageTitles();
    state.activePageId = state.pages[nextIndex]?.id || state.pages[0]?.id || null;
    state.selectedImageId = null;
    renderPageNav();
    renderImages();
}

function syncPageTitles() {
    state.pages.forEach((page, index) => {
        page.title = `Página ${index + 1}`;
    });
}

[widthInput, heightInput].forEach((element) => {
    element.addEventListener("change", updatePreview);
    element.addEventListener("blur", updatePreview);
});

pageSizeSelect.addEventListener("change", () => {
    const dimensions = getPageDimensions(pageSizeSelect.value);
    state.pageWidthCm = dimensions.width;
    state.pageHeightCm = dimensions.height;

    state.pages.forEach((page) => {
        page.images.forEach((image) => {
            image.xCm = clamp(image.xCm, 0, Math.max(0, state.pageWidthCm - image.widthCm));
            image.yCm = clamp(image.yCm, 0, Math.max(0, state.pageHeightCm - image.heightCm));
        });
    });

    renderImages();
});

pagePaper.addEventListener("pointerdown", (event) => {
    if (event.target === pagePaper || event.target === pageContent) {
        deselectImage();
    }
});

deleteImageButton.addEventListener("click", removeSelectedImage);
addPageButton.addEventListener("click", addPage);
removePageButton.addEventListener("click", removeActivePage);
printButton.addEventListener("click", printCurrentPage);

window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", handlePointerUp);
window.addEventListener("resize", () => renderImages());

initializePreview();
setupModal.style.display = "flex";

async function handleImageUpload(event) {
    const files = Array.from(event.target.files || []).slice(0, 200);
    if (files.length === 0) return;

    const widthCM = parseFloat(widthInput.value);
    const heightCM = parseFloat(heightInput.value);
    const pageSize = pageSizeSelect.value;

    const dimensions = getPageDimensions(pageSize);
    state.pageWidthCm = dimensions.width;
    state.pageHeightCm = dimensions.height;

    const activePage = state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
    const currentCount = activePage.images.length;
    const newImages = [];

    for (let i = 0; i < files.length; i++) {
        if (activePage.images.length + newImages.length >= 200) break;

        const imgData = await resizeImage(files[i], widthCM, heightCM);
        const placement = createPlacementForImage(files[i], imgData, currentCount + newImages.length, widthCM, heightCM);
        newImages.push(placement);
    }

    activePage.images = [...activePage.images, ...newImages];
    state.selectedImageId = null;
    imageInput.value = "";
    renderImages();
}

function createPlacementForImage(file, imageData, index, widthCM, heightCM) {
    const marginCm = 0.8;
    const maxCols = Math.max(1, Math.floor((state.pageWidthCm - marginCm * 2) / (widthCM + 0.5)));
    const col = index % maxCols;
    const row = Math.floor(index / maxCols);

    return {
        id: createId(),
        file,
        imageData,
        xCm: marginCm + col * (widthCM + 0.5),
        yCm: marginCm + row * (heightCM + 0.5),
        widthCm: widthCM,
        heightCm: heightCM,
    };
}

function createId() {
    return window.crypto?.randomUUID ? window.crypto.randomUUID() : `img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initializePreview() {
    const dimensions = getPageDimensions(pageSizeSelect.value);
    state.pageWidthCm = dimensions.width;
    state.pageHeightCm = dimensions.height;
    state.activePageId = state.pages[0].id;
    renderPageNav();
    renderImages();
}

function getPageDimensions(pageSize) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "cm", format: pageSize });
    return {
        width: pdf.internal.pageSize.getWidth(),
        height: pdf.internal.pageSize.getHeight(),
    };
}

async function resizeImage(file, widthCM, heightCM) {
    const dpi = 220;
    const targetWidth = Math.max(1200, Math.round((widthCM / 2.54) * dpi));
    const targetHeight = Math.max(1200, Math.round((heightCM / 2.54) * dpi));

    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                resolve(canvas.toDataURL("image/jpeg", 0.95));
            };
            img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
        reader.readAsDataURL(file);
    });
}

function renderPageNav() {
    pageNav.innerHTML = "";
    state.pages.forEach((page) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = state.activePageId === page.id ? "active" : "";
        button.textContent = page.title;
        button.addEventListener("click", () => setActivePage(page.id));
        pageNav.appendChild(button);
    });
}

function renderImages() {
    const activePage = state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
    const previewFrame = pagePaper.parentElement;
    const frameWidth = previewFrame ? previewFrame.clientWidth : 720;
    const frameHeight = previewFrame ? previewFrame.clientHeight : 720;
    const availableWidth = Math.max(240, frameWidth - 40);
    const availableHeight = Math.max(240, frameHeight - 80);
    const ratio = state.pageWidthCm / state.pageHeightCm;
    const widthByHeight = availableHeight * ratio;
    const heightByWidth = availableWidth / ratio;
    const targetWidth = Math.min(availableWidth, widthByHeight);
    const targetHeight = Math.min(availableHeight, heightByWidth);

    state.scalePxPerCm = Math.min(targetWidth / state.pageWidthCm, targetHeight / state.pageHeightCm);

    if (pageTitle) {
        pageTitle.textContent = activePage ? activePage.title : "Página";
    }

    pagePaper.style.aspectRatio = `${state.pageWidthCm} / ${state.pageHeightCm}`;
    pagePaper.style.width = `${Math.max(180, Math.round(state.pageWidthCm * state.scalePxPerCm))}px`;
    pagePaper.style.height = `${Math.max(180, Math.round(state.pageHeightCm * state.scalePxPerCm))}px`;
    pagePaper.style.maxWidth = "100%";
    pagePaper.style.maxHeight = "100%";
    pageContent.innerHTML = "";
    updateSelectionUI();

    if (!activePage || activePage.images.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "preview-empty";
        emptyState.textContent = "Añade imágenes para ver la vista previa interactiva de la página.";
        pageContent.appendChild(emptyState);
        return;
    }

    activePage.images.forEach((image) => {
        const item = document.createElement("div");
        item.className = `preview-image-item ${state.selectedImageId === image.id ? "selected" : ""}`;
        item.dataset.id = image.id;
        item.style.left = `${image.xCm * state.scalePxPerCm}px`;
        item.style.top = `${image.yCm * state.scalePxPerCm}px`;
        item.style.width = `${image.widthCm * state.scalePxPerCm}px`;
        item.style.height = `${image.heightCm * state.scalePxPerCm}px`;

        const previewImg = document.createElement("img");
        previewImg.src = image.imageData;
        previewImg.alt = "Vista previa";

        const handle = document.createElement("div");
        handle.className = "resize-handle";

        item.appendChild(previewImg);
        item.appendChild(handle);
        item.addEventListener("pointerdown", (event) => startInteraction(event, image.id));
        item.addEventListener("dblclick", (event) => {
            event.preventDefault();
            event.stopPropagation();
            autoFitSelectedImage(image.id);
        });
        pageContent.appendChild(item);
    });
}

function updateImageElement(image) {
    const element = pageContent.querySelector(`[data-id="${image.id}"]`);
    if (!element) return;

    element.style.left = `${image.xCm * state.scalePxPerCm}px`;
    element.style.top = `${image.yCm * state.scalePxPerCm}px`;
    element.style.width = `${image.widthCm * state.scalePxPerCm}px`;
    element.style.height = `${image.heightCm * state.scalePxPerCm}px`;
    element.classList.toggle("selected", state.selectedImageId === image.id);
}

function updatePreview() {
    const widthCM = parseFloat(widthInput.value);
    const heightCM = parseFloat(heightInput.value);

    if (Number.isNaN(widthCM) || Number.isNaN(heightCM)) return;

    applyDimensionsToActivePage(widthCM, heightCM);
    renderImages();
}

function startInteraction(event, imageId) {
    const activePage = state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
    const image = activePage.images.find((item) => item.id === imageId);
    if (!image) return;

    event.preventDefault();
    event.stopPropagation();
    selectImage(imageId);

    const isResizeHandle = event.target.classList.contains("resize-handle");
    state.drag = {
        type: isResizeHandle ? "resize" : "move",
        imageId,
        startX: event.clientX,
        startY: event.clientY,
        startRect: {
            xCm: image.xCm,
            yCm: image.yCm,
            widthCm: image.widthCm,
            heightCm: image.heightCm,
        },
    };
}

function handlePointerMove(event) {
    if (!state.drag) return;

    const activePage = state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
    const image = activePage.images.find((item) => item.id === state.drag.imageId);
    if (!image) return;

    const deltaX = (event.clientX - state.drag.startX) / state.scalePxPerCm;
    const deltaY = (event.clientY - state.drag.startY) / state.scalePxPerCm;

    if (state.drag.type === "move") {
        image.xCm = clamp(state.drag.startRect.xCm + deltaX, 0, state.pageWidthCm - image.widthCm);
        image.yCm = clamp(state.drag.startRect.yCm + deltaY, 0, state.pageHeightCm - image.heightCm);
    } else {
        image.widthCm = clamp(state.drag.startRect.widthCm + deltaX, 0.5, state.pageWidthCm - image.xCm);
        image.heightCm = clamp(state.drag.startRect.heightCm + deltaY, 0.5, state.pageHeightCm - image.yCm);
    }

    widthInput.value = image.widthCm.toFixed(1);
    heightInput.value = image.heightCm.toFixed(1);
    updateImageElement(image);
}

function handlePointerUp() {
    if (state.drag) {
        renderImages();
    }
    state.drag = null;
}

function selectImage(imageId) {
    state.selectedImageId = imageId;
    const activePage = state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
    const image = activePage.images.find((item) => item.id === imageId);
    if (image) {
        widthInput.value = image.widthCm.toFixed(1);
        heightInput.value = image.heightCm.toFixed(1);
    }
    renderImages();
}

function applyDimensionsToActivePage(widthCM, heightCM) {
    const activePage = state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
    if (!activePage || activePage.images.length === 0) return;

    activePage.images.forEach((image) => {
        image.widthCm = clamp(widthCM, 0.5, state.pageWidthCm);
        image.heightCm = clamp(heightCM, 0.5, state.pageHeightCm);
    });

    widthInput.value = widthCM.toFixed(1);
    heightInput.value = heightCM.toFixed(1);
}

function deselectImage() {
    state.selectedImageId = null;
    renderImages();
}

function removeSelectedImage() {
    if (!state.selectedImageId) return;

    const activePage = state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
    activePage.images = activePage.images.filter((image) => image.id !== state.selectedImageId);
    state.selectedImageId = null;
    renderImages();
}

function updateSelectionUI() {
    deleteImageButton.disabled = !state.selectedImageId;
}

function autoFitSelectedImage(imageId) {
    const activePage = state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
    const image = activePage?.images.find((item) => item.id === imageId);
    if (!image) return;

    selectImage(imageId);

    const marginCm = 0.8;
    const maxWidth = Math.max(1, state.pageWidthCm - marginCm * 2);
    const maxHeight = Math.max(1, state.pageHeightCm - marginCm * 2);
    const aspectRatio = image.widthCm / image.heightCm || 1;

    let widthCm = image.widthCm;
    let heightCm = image.heightCm;

    if (widthCm > maxWidth) {
        widthCm = maxWidth;
        heightCm = widthCm / aspectRatio;
    }

    if (heightCm > maxHeight) {
        heightCm = maxHeight;
        widthCm = heightCm * aspectRatio;
    }

    image.widthCm = clamp(widthCm, 0.5, state.pageWidthCm);
    image.heightCm = clamp(heightCm, 0.5, state.pageHeightCm);
    image.xCm = clamp((state.pageWidthCm - image.widthCm) / 2, 0, state.pageWidthCm - image.widthCm);
    image.yCm = clamp((state.pageHeightCm - image.heightCm) / 2, 0, state.pageHeightCm - image.heightCm);

    widthInput.value = image.widthCm.toFixed(1);
    heightInput.value = image.heightCm.toFixed(1);
    renderImages();
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function printCurrentPage() {
    const activePage = state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
    if (!activePage || activePage.images.length === 0) {
        return alert("Añade al menos una imagen para imprimir.");
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
        return alert("El navegador bloqueó la ventana de impresión.");
    }

    const pageWidthCm = state.pageWidthCm;
    const pageHeightCm = state.pageHeightCm;
    const printableWidth = `${pageWidthCm}cm`;
    const printableHeight = `${pageHeightCm}cm`;

    const imageMarkup = activePage.images.map((image) => {
        const left = `${image.xCm}cm`;
        const top = `${image.yCm}cm`;
        const width = `${image.widthCm}cm`;
        const height = `${image.heightCm}cm`;
        return `<div style="position:absolute; left:${left}; top:${top}; width:${width}; height:${height}; border:1px solid #ddd; overflow:hidden; background:#fff; box-sizing:border-box;">
            <img src="${image.imageData}" alt="Imagen" style="width:100%; height:100%; object-fit:contain; display:block;">
        </div>`;
    }).join("");

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Imprimir página</title>
            <style>
                body { margin: 0; background: #fff; font-family: Arial, sans-serif; }
                .sheet {
                    position: relative;
                    width: ${printableWidth};
                    height: ${printableHeight};
                    margin: 0 auto;
                    background: #fff;
                    box-shadow: 0 0 0 1px #ccc;
                    overflow: hidden;
                }
                @page { size: ${pageWidthCm}cm ${pageHeightCm}cm; margin: 0; }
                @media print {
                    body { background: #fff; }
                    .sheet { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="sheet">${imageMarkup}</div>
            <script>
                window.onload = () => window.print();
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function generarPDF() {
    const { jsPDF } = window.jspdf;
    const pageSize = pageSizeSelect.value;

    const totalImages = state.pages.reduce((count, page) => count + page.images.length, 0);
    if (totalImages === 0) return alert("Sube al menos una imagen.");
    if (totalImages > 200) return alert("Máximo 200 imágenes.");

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "cm",
        format: pageSize,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    state.pages.forEach((page, pageIndex) => {
        if (pageIndex > 0) {
            pdf.addPage();
        }

        page.images.forEach((image) => {
            const safeX = clamp(image.xCm, 0, Math.max(0, pageWidth - image.widthCm));
            const safeY = clamp(image.yCm, 0, Math.max(0, pageHeight - image.heightCm));
            pdf.addImage(image.imageData, "JPEG", safeX, safeY, image.widthCm, image.heightCm);
        });
    });

    pdf.save("Imagenes.pdf");
}
