import axios from 'axios';
import { showAlert } from './alert';

// type is either data or password
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'data'
        ? 'http://127.0.0.1:3000/api/v1/users/update-me'
        : 'http://127.0.0.1:3000/api/v1/users/update-password';

    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });

    if (res.data.status === 'success') {
      showAlert(
        'success',
        `${type === 'data' ? 'Data updated successfully' : 'Password updated successfully'}`,
      );
    }
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};
