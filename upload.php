<?php
header('Content-Type: application/json');

// Directory where document (images) will be stored
$target_dir = "document/";
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0777, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['profileImage'])) {
    $file = $_FILES['profileImage'];
    
    // Check for errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'error' => 'File upload error code: ' . $file['error']]);
        exit;
    }
    
    // Sanitize filename
    $filename = uniqid() . '-' . basename($file['name']);
    $filename = preg_replace("/[^a-zA-Z0-9\.\-_]/", "", $filename); 
    $target_file = $target_dir . $filename;
    
    // Check if image file is a actual image
    $check = getimagesize($file['tmp_name']);
    if($check !== false) {
        if (move_uploaded_file($file['tmp_name'], $target_file)) {
            echo json_encode(['success' => true, 'url' => $target_file]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'File is not an image.']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'No file uploaded or invalid request.']);
}
?>
