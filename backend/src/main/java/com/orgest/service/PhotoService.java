package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.config.OrgestProperties;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Iterator;
import java.util.UUID;
import java.util.regex.Pattern;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Upload sécurisé (A04/A08) : taille limitée, signature (magic bytes) vérifiée, image décodée puis RÉ-ENCODÉE
 * en JPEG (supprime EXIF et toute charge utile), nom de fichier généré côté serveur (pas de path traversal),
 * stockage hors de la racine web, accès uniquement via un endpoint authentifié filtré par commerçant.
 */
@Service
public class PhotoService {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final long MAX_PIXELS = 40_000_000L;
    private static final int MAX_SIDE = 1024;
    private static final Pattern NAME = Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg$");
    private final Path root;

    public PhotoService(OrgestProperties props) {
        this.root = Paths.get(props.uploadDir()).toAbsolutePath().normalize();
    }

    public String store(Long shopId, MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES) throw AppException.bad("INVALID_IMAGE");
        try {
            byte[] bytes = file.getBytes();
            if (!isJpeg(bytes) && !isPng(bytes)) throw AppException.bad("INVALID_IMAGE");
            BufferedImage img = decode(bytes);
            BufferedImage out = normalize(img);
            String name = UUID.randomUUID() + ".jpg";
            Path dir = root.resolve(String.valueOf(shopId)).normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve(name).normalize();
            if (!target.startsWith(root)) throw AppException.bad("INVALID_IMAGE");
            writeJpeg(out, target);
            return name;
        } catch (IOException e) {
            throw AppException.bad("INVALID_IMAGE");
        }
    }

    public Path resolve(Long shopId, String name) {
        if (name == null || !NAME.matcher(name).matches()) throw AppException.notFound();
        Path p = root.resolve(String.valueOf(shopId)).resolve(name).normalize();
        if (!p.startsWith(root) || !Files.isRegularFile(p)) throw AppException.notFound();
        return p;
    }

    public void delete(Long shopId, String name) {
        try {
            if (name != null && NAME.matcher(name).matches()) {
                Files.deleteIfExists(root.resolve(String.valueOf(shopId)).resolve(name).normalize());
            }
        } catch (IOException ignored) {
            // non bloquant
        }
    }

    private static boolean isJpeg(byte[] b) {
        return b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
    }

    private static boolean isPng(byte[] b) {
        return b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
    }

    private static BufferedImage decode(byte[] bytes) throws IOException {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> it = ImageIO.getImageReaders(in);
            if (!it.hasNext()) throw AppException.bad("INVALID_IMAGE");
            ImageReader reader = it.next();
            try {
                reader.setInput(in, true, true);
                long w = reader.getWidth(0), h = reader.getHeight(0);
                if (w <= 0 || h <= 0 || w * h > MAX_PIXELS) throw AppException.bad("INVALID_IMAGE");
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        }
    }

    private static BufferedImage normalize(BufferedImage src) {
        int w = src.getWidth(), h = src.getHeight();
        double scale = Math.min(1.0, (double) MAX_SIDE / Math.max(w, h));
        int nw = Math.max(1, (int) Math.round(w * scale)), nh = Math.max(1, (int) Math.round(h * scale));
        BufferedImage out = new BufferedImage(nw, nh, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, nw, nh);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.drawImage(src, 0, 0, nw, nh, null);
        } finally {
            g.dispose();
        }
        return out;
    }

    private static void writeJpeg(BufferedImage img, Path target) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ImageOutputStream out = ImageIO.createImageOutputStream(Files.newOutputStream(target))) {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(0.85f);
            writer.setOutput(out);
            writer.write(null, new IIOImage(img, null, null), param);
        } finally {
            writer.dispose();
        }
    }
}
