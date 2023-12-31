import { Button } from "react-bootstrap";
import styles from "../../styles/AdminPage.module.css";

interface ConfirmDeleteModalProps {
  onClickedConfirmDeleteUser: () => void;
  onClickedBackButton: () => void;
}

const ConfirmDeleteModal = ({
  onClickedConfirmDeleteUser,
  onClickedBackButton,
}: ConfirmDeleteModalProps) => {
  return (
    <div className={styles.results_container}>
      <p className={styles.confirm_delete_text}>Confirm Delete?</p>
      <div className={styles.button_box}>
        <Button type="button" onClick={onClickedBackButton}>
          Back
        </Button>
        <Button
          className={styles.confirm_delete_button}
          type="button"
          onClick={onClickedConfirmDeleteUser}
        >
          Delete
        </Button>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
