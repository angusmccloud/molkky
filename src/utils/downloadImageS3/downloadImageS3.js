import { Storage } from 'aws-amplify';

const downloadImageS3 = (uri, setImage) => {
  Storage.get(uri)
    .then((result) => {
      setImage(result)
    })
    .catch((err) => console.log(err));
};

export default downloadImageS3;