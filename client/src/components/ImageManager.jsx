import { useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useConfirm } from "../hooks/useConfirm";
import {
  uploadRoomImages, removeRoomImageRequest, setCoverImageRequest,
} from "../services/adminService";
import { optimizeImage } from "../utils/cloudinary";

const MAX_IMAGES = 8;
const MAX_FILES_AT_ONCE = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function ImageManager({ room, onChange }) {
  const { setUser } = useAuth();
  const confirm = useConfirm();
  const inputRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState([]);

  const images = room.images; 

  function fail(err) {
    if (err.status === 401) setUser(null);
    else setError(err.message);
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    e.target.value = ""; 
    setError("");
    setFailed([]);
    if (files.length === 0) return;

    if (files.length > MAX_FILES_AT_ONCE) return setError(`Choose up to ${MAX_FILES_AT_ONCE} images at a time`);
    if (images.length + files.length > MAX_IMAGES) {
      return setError(`A room can have up to ${MAX_IMAGES} photos (it has ${images.length})`);
    }
    const bad = files.find((f) => !ALLOWED.includes(f.type) || f.size > MAX_BYTES);
    if (bad) return setError(`"${bad.name}" must be a JPG, PNG, or WebP under 5 MB`);

    setBusy(true);
    try {
      const result = await uploadRoomImages(room._id, files);
      onChange(result.room);
      setFailed(result.failed);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleCover(image) {
    setError("");
    setBusy(true);
    try {
      onChange(await setCoverImageRequest(room._id, image.publicId));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(image) {
    const ok = await confirm({
      title: "Delete this photo?",
      message: "It will be removed from the room and permanently deleted from the image library.",
      confirmLabel: "Delete photo",
      danger: true,
    });
    if (!ok) return;

    setError("");
    setBusy(true);
    try {
      onChange(await removeRoomImageRequest(room._id, image.publicId));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="image-manager">
      <h2>Photos</h2>
      <p className="muted">
        The first photo is the cover shown on the website. JPG, PNG, or WebP, up to 5 MB each,
        {" "}{images.length} of {MAX_IMAGES} used.
      </p>

      {error && <div className="state state--error">{error}</div>}
      {failed.length > 0 && (
        <div className="state state--error">
          Some files were not uploaded:
          <ul>{failed.map((f, i) => <li key={i}>{f.name}: {f.reason}</li>)}</ul>
        </div>
      )}

      <div className="image-grid">
        {images.map((img, i) => (
          <figure key={img.publicId} className="image-tile">
            <img src={optimizeImage(img.url, 320, 240)} alt={`Room photo ${i + 1}`} />
            {i === 0 && <span className="badge image-tile__cover">Cover</span>}
            <figcaption>
              {i !== 0 && (
                <button type="button" className="btn btn--outline" disabled={busy}
                  onClick={() => handleCover(img)}>Make cover</button>
              )}
              <button type="button" className="btn btn--outline" disabled={busy}
                onClick={() => handleRemove(img)}>Delete</button>
            </figcaption>
          </figure>
        ))}
      </div>

      {images.length === 0 && <div className="state">No photos yet.</div>}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
        onChange={handleFiles} />
      <button type="button" className="btn btn--primary" disabled={busy || images.length >= MAX_IMAGES}
        onClick={() => inputRef.current.click()}>
        {busy ? "Working..." : "+ Add photos"}
      </button>
    </section>
  );
}

export default ImageManager;