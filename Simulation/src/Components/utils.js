import moment from "moment";
import { toast } from "react-toastify";

export function notify(type, message, timer = 2000) {
  if (type === "success") {
    return toast.success(message, {
      position: "top-center",
      autoClose: timer,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  }
  if (type === "error") {
    return toast.error(message, {
      position: "top-center",
      autoClose: timer,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  }
  if (type === "warning") {
    return toast.warn(message, {
      position: "top-center",
      autoClose: timer,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  }
}

export function parse(dateStr){
  return moment.parseZone(dateStr);
}