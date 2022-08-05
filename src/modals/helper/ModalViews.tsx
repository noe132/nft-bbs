import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import { modalViewState } from './modalViewState';

export const ModalViews = observer(() => (<>
  {modalViewState.list.map((item) => (
    <item.component
      {...item.props}
      key={item.id}
      rs={(u: unknown) => {
        item.resolve(u);
        setTimeout(action(() => {
          const index = modalViewState.list.indexOf(item);
          if (index !== -1) {
            modalViewState.list.splice(index, 1);
          }
        }));
      }}
    />
  ))}
</>));
