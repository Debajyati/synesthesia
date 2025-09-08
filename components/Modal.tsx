import React, { useEffect, useRef } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog) {
            if (isOpen) {
                dialog.showModal();
            } else {
                dialog.close();
            }
        }
    }, [isOpen]);
    
    const handleConfirm = () => {
        onConfirm();
        onClose();
    }

    return (
        <dialog ref={dialogRef} className="modal" onCancel={onClose}>
            <div className="modal-box">
                <h3 className="font-bold text-lg">{title}</h3>
                <div className="py-4">{children}</div>
                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleConfirm}>Proceed</button>
                </div>
            </div>
             <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};

export default Modal;
