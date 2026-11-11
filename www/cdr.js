// Función para previsualizar las fotos
function previewPhotos(event) {
    const photoPreview = document.getElementById('photoPreview');
    photoPreview.innerHTML = '';
    
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'photo-item';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            
            div.appendChild(img);
            photoPreview.appendChild(div);
        }
        
        reader.readAsDataURL(file);
    }
}

// Función para generar el PDF
function generatePDF() {
    // Preparar la vista previa
    const preview = document.getElementById('preview');
    preview.style.display = 'block';
    
    // Obtener valores de campos seleccionados
    const componenteValue = document.getElementById('componente').value;
    const marcaValue = document.getElementById('marca').value;
    const discoValue = document.getElementById('discoDuro').value;
    const ramValue = document.getElementById('ram').value;
    const soValue = document.getElementById('sistemaOperativo').value;
    
    // Construir el contenido HTML para la vista previa y el PDF
    let previewHTML = `
        <div class="preview-header">
            <div class="logo-placeholder"><img src="Imagenes/Belcorp.jpg" alt="Logo Belcorp"></div>
            <h2>Centro de Servicios Intergrupo - Belcorp</h2>
            <div class="logo-placeholder2"><img src="Imagenes/softwareone.jpeg" alt="Logo SWO"></div>
        </div>
        <h1 class="preview-title">REPORTE TÉCNICO CDR</h1>
        
        <table>
            <tr>
                <th>Fecha de Ingreso:</th>
                <td>${document.getElementById('fechaIngreso').value}</td>
                <th>RDS Responsable:</th>
                <td>${document.getElementById('rdsResponsable').value}</td>
            </tr>
            <tr>
                <th>Ticket:</th>
                <td>${document.getElementById('ticket').value}</td>
                <th>Usuario:</th>
                <td>${document.getElementById('usuario').value}</td>
            </tr>
            <tr>
                <th>Área:</th>
                <td>${document.getElementById('area').value}</td>
                <th>Cargo:</th>
                <td>${document.getElementById('cargo').value}</td>
            </tr>
        </table>
        
        <h3>Datos Componente que Ingresa al Centro</h3>
        <table>
            <tr>
                <th>Componente:</th>
                <td>${componenteValue}</td>
                <th>Marca:</th>
                <td>${marcaValue}</td>
            </tr>
            <tr>
                <th>Modelo:</th>
                <td>${document.getElementById('modelo').value}</td>
                <th>Serial:</th>
                <td>${document.getElementById('serial').value}</td>
            </tr>
            <tr>
                <th>Placa:</th>
                <td>${document.getElementById('placa').value}</td>
                <th>Disco Duro:</th>
                <td>${discoValue}</td>
            </tr>
            <tr>
                <th>RAM:</th>
                <td>${ramValue}</td>
                <th>Sistema Operativo:</th>
                <td>${soValue}</td>
            </tr>
            <tr>
                <th>¿Entrega equipo?:</th>
                <td>${document.querySelector('input[name="entregaEquipo"]:checked')?.value || ''}</td>
                <th>¿Entrega cargador?:</th>
                <td>${document.querySelector('input[name="entregaCargador"]:checked')?.value || ''}</td>
            </tr>
        </table>
        
        <h3>Reporte Técnico</h3>
        <table>
            <tr>
                <th>¿Qué pasó?</th>
                <td>${document.getElementById('quePaso').value}</td>
            </tr>
            <tr>
                <th>¿Que se realizó?</th>
                <td>${document.getElementById('realizadoPreviamente').value}</td>
            </tr>
            <tr>
                <th>¿Afecta la operación?</th>
                <td>${document.querySelector('input[name="afectaOperacion"]:checked')?.value || ''}</td>
            </tr>
        </table>
        
        <h3>Recomendaciones y Observaciones</h3>
        <p>${document.getElementById('recomendaciones').value}</p>
        
        <h3>Evidencia Fotográfica</h3>
        <div class="pdf-photo-preview">`;
        
    // Obtener elementos de foto
    const photoItems = document.querySelectorAll('.photo-item');
    photoItems.forEach(item => {
        previewHTML += `
            <div class="pdf-photo-item">
                ${item.innerHTML}
            </div>`;
    });
    
    previewHTML += `</div>`;
    
    preview.innerHTML = previewHTML;
    
    // Generar el PDF usando html2canvas y jsPDF
    setTimeout(() => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const previewElement = document.getElementById('preview');
        
        // Convertir el contenido a una imagen para la primera página
        html2canvas(previewElement, { 
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: true,
            ignoreElements: (element) => {
                // Ignorar las fotos para procesar primero el contenido principal
                return element.classList.contains('pdf-photo-preview');
            }
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = 0;
            const imgY = 0;
            
            pdf.addImage(imgData, 'JPEG', imgX, imgY, pdfWidth, imgHeight * ratio);
            
            // Procesar cada imagen en páginas separadas, 2 por página
            const photoItems = document.querySelectorAll('.pdf-photo-item');
            if (photoItems.length > 0) {
                let currentPage = pdf.internal.getNumberOfPages();
                let imagesOnCurrentPage = 0;
                
                const processNextImage = (index) => {
                    if (index >= photoItems.length) {
                        // Terminar cuando se han procesado todas las imágenes
                        pdf.save('Reporte_Tecnico_CDR.pdf');
                        return;
                    }
                    
                    // Agregar nueva página si es necesario
                    if (imagesOnCurrentPage === 0) {
                        pdf.addPage();
                        currentPage++;
                        imagesOnCurrentPage = 0;
                    }
                    
                    const photoItem = photoItems[index];
                    
                    html2canvas(photoItem, { 
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        logging: true
                    }).then(canvas => {
                        const imgData = canvas.toDataURL('image/jpeg', 1.0);
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (pdf.internal.pageSize.getHeight() - 20) / 2;
                        const imgWidth = canvas.width;
                        const imgHeight = canvas.height;
                        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                        const imgX = (pdfWidth - imgWidth * ratio) / 2;
                        const imgY = imagesOnCurrentPage * pdfHeight + 10;
                        
                        pdf.setPage(currentPage);
                        pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
                        
                        imagesOnCurrentPage++;
                        if (imagesOnCurrentPage >= 2) {
                            imagesOnCurrentPage = 0;
                        }
                        
                        // Procesar la siguiente imagen
                        processNextImage(index + 1);
                    });
                };
                
                // Comenzar a procesar las imágenes
                processNextImage(0);
            } else {
                pdf.save('Reporte_Tecnico_CDR.pdf');
            }
        });
    }, 1000);
}