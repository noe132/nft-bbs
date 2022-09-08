import classNames from 'classnames';
import { useNavigate } from 'react-router-dom';
import { Button, ButtonProps } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

interface Props extends ButtonProps {
  to?: string
}

export const BackButton = (props: Props) => {
  const { className, to, ...restProps } = props;
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <Button
      className={classNames(
        'rounded-full h-12 w-12 min-w-0 p-0 flex-center text-white',
        className,
      )}
      color="inherit"
      variant="outlined"
      onClick={handleClick}
      {...restProps}
    >
      <ArrowBack className="text-26" />
    </Button>
  );
};
