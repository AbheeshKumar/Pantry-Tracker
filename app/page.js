"use client";
import Image from "next/image";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { firestore } from "@/firebase";
import {
  AppBar,
  Box,
  Button,
  Container,
  FormControl,
  Input,
  InputLabel,
  Link,
  MenuItem,
  Modal,
  Select,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import AdbIcon from "@mui/icons-material/Adb";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Webcam from "react-webcam";

export default function Home() {
  const [pantry, setPantry] = useState([]);
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState({
    name: "",
    category: "",
    quantity: null,
    imgUrl: null,
  });
  const [category, setCategory] = useState("");
  const [searchName, setSearchName] = useState("");
  const [updatedPantry, setUpdatedPantry] = useState();
  const [sortOrder, setSortOrder] = useState("");
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);

  const updatePantry = async () => {
    const snapshot = query(collection(firestore, "pantry"));
    const docs = await getDocs(snapshot);
    const storage = getStorage();
    const pantryList = await Promise.all(
      docs.docs.map(async (doc) => {
        console.log(doc.data());
        const imageRef = ref(
          storage,
          `images/${doc.id}_${doc.data().category}.jpg`
        );
        const url = await getDownloadURL(imageRef);
        return {
          name: doc.id,
          ...doc.data(),
          image: url,
        };
      })
    );

    setPantry(pantryList);
    setUpdatedPantry(pantryList);
  };
  const removeItem = async (name) => {
    const docRef = doc(collection(firestore, "pantry"), name);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity, name, category } = docSnap.data();
      if (quantity == 1) {
        const imageRef = ref(storage, `images/${name}_${category}.jpg`);
        await deleteDoc(docRef);
        await deleteObject(imageRef);
      } else {
        await setDoc(docRef, { quantity: quantity - 1 });
      }
    }
    await updatePantry();
  };

  const addItem = async (item) => {
    const name = item.name ? item.name : item;
    const quant = item.quantity ? item.quantity : 0;
    const cat = item.category ? item.category : null;

    const docRef = doc(collection(firestore, "pantry"), name);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      await setDoc(docRef, { ...docSnap.data(), quantity: quantity + 1 });
    } else {
      await setDoc(docRef, { quantity: quant, category: cat });
    }
    await updatePantry();
  };

  const handleSearch = () => {
    const trimmedSearchItem = searchName.trim().toLowerCase();

    if (trimmedSearchItem.length === 0) {
      console.log("update");
      updatePantry();
      return;
    }

    const filteredPantry = pantry.filter((item) =>
      item.name.toLowerCase().includes(trimmedSearchItem)
    );

    setPantry(filteredPantry);
  };

  const handleCategory = () => {
    const tempCatItems = pantry.filter((item) => item.category === category);
    setUpdatedPantry(tempCatItems);
  };

  const sortPantryByQuantity = () => {
    const sortedPantry = [...pantry].sort((a, b) => {
      if (sortOrder === "High") {
        return b.quantity - a.quantity;
      } else {
        return a.quantity - b.quantity;
      }
    });
    setUpdatedPantry(sortedPantry);
  };

  const handleSortChange = (e) => {
    const order = e.target.value;
    setSortOrder(order);
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef, setImgSrc]);

  const dataURLToBlob = (dataURL) => {
    const [header, base64] = dataURL.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], { type: mime });
  };

  const uploadImage = () => {
    const storage = getStorage();
    const blob = dataURLToBlob(imgSrc);
    const metadata = {
      contentType: "image/jpeg",
    };

    const storageRef = ref(storage, `images/${item.name}_${item.category}.jpg`);
    const uploadTask = uploadBytesResumable(storageRef, blob, metadata);
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
        switch (snapshot.state) {
          case "paused":
            console.log("Upload is paused");
            break;
          case "running":
            console.log("Upload is running");
            break;
        }
      },
      (error) => {
        // A full list of error codes is available at
        // https://firebase.google.com/docs/storage/web/handle-errors
        switch (error.code) {
          case "storage/unauthorized":
            // User doesn't have permission to access the object
            break;
          case "storage/canceled":
            // User canceled the upload
            break;

          // ...

          case "storage/unknown":
            // Unknown error occurred, inspect error.serverResponse
            break;
        }
      },
      () => {
        // Upload completed successfully, now we can get the download URL
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log("File available at", downloadURL);
          setItem({ ...item, imgUrl: downloadURL });
        });
      }
    );
  };

  useEffect(() => {
    if (category == "") updatePantry();
    else handleCategory();
  }, [category]);

  useEffect(() => {
    if (sortOrder == "") updatePantry();
    else sortPantryByQuantity();
  }, [sortOrder]);

  useEffect(() => {
    updatePantry();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <React.Fragment>
      <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar>
            <AdbIcon sx={{ display: { xs: "none", md: "flex" }, mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              component="a"
              sx={{
                mr: 2,
                display: { xs: "none", md: "flex" },
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".3rem",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              Pantry Tracker
            </Typography>
          </Toolbar>
        </Container>
      </AppBar>
      <Box
        width="100vw"
        height="100vh"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        gap={2}
      >
        <Modal open={open} onClose={handleClose}>
          <Box
            position="absolute"
            top="50%"
            left="50%"
            width={400}
            borderRadius="10px"
            bgcolor="white"
            border="2px solid black"
            boxShadow={24}
            p={4}
            display="flex"
            flexDirection="column"
            gap={3}
            sx={{
              transform: "translate(-50%,-50%)",
            }}
          >
            <Stack direction="column">
              <React.Fragment>
                <Typography variant="h6">Name: </Typography>
                <Stack width="100%" direction="row" spacing={2}>
                  <TextField
                    variant="outlined"
                    fullWidth
                    value={item.name}
                    onChange={(e) => setItem({ ...item, name: e.target.value })}
                  ></TextField>
                </Stack>
              </React.Fragment>
              <React.Fragment>
                <Typography variant="h6">Quantity: </Typography>
                <Stack width="100%" direction="row" spacing={2}>
                  <TextField
                    variant="outlined"
                    fullWidth
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      setItem({ ...item, quantity: Number(e.target.value) })
                    }
                  ></TextField>
                </Stack>
              </React.Fragment>
              <React.Fragment>
                <Typography variant="h6" id="select-label">
                  Category:
                </Typography>
                <Select
                  labelid="select-label"
                  value={item.category || ""}
                  onChange={(e) =>
                    setItem({ ...item, category: e.target.value })
                  }
                >
                  <MenuItem value="Food">Food</MenuItem>
                  <MenuItem value="Logistics">Logistics</MenuItem>
                  <MenuItem value="Fresh">Fresh</MenuItem>
                  <MenuItem value="Electronics">Electronics</MenuItem>
                  <MenuItem value="Household">Household</MenuItem>
                  <MenuItem value="Medicine">Medicine</MenuItem>
                </Select>
              </React.Fragment>
            </Stack>

            {imgSrc ? (
              <img src={imgSrc} />
            ) : (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenShotFormat="image/jpeg"
              />
            )}
            {imgSrc ? (
              <Button variant="outlined" onClick={() => setImgSrc(null)}>
                Retake
              </Button>
            ) : (
              <Button variant="outlined" onClick={capture}>
                Add Picture
              </Button>
            )}

            <Button
              variant="outlined"
              onClick={() => {
                addItem(item);
                uploadImage();
                setItem({});
                setImgSrc(null);
                handleClose();
              }}
            >
              Upload
            </Button>
          </Box>
        </Modal>

        <Stack width="800px" direction="row" justifyContent="space-between">
          <Box width="80%" labelid="Search" position="relative" marginLeft="">
            <Input
              onChange={(e) => {
                setSearchName(e.target.value);
              }}
              fullWidth
              value={searchName}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSearch()
              }
              placeholder="Search, Press Enter to Search"
            />
          </Box>
          <Button
            variant="contained"
            onClick={() => {
              handleOpen();
            }}
          >
            Add New Item
          </Button>
        </Stack>

        <Stack width="800px" direction="row" gap="1rem">
          <Box labelid="category">
            <FormControl variant="standard" sx={{ minWidth: "200px" }}>
              <InputLabel id="demo-simple-select-label">Category</InputLabel>
              <Select
                labelid="demo-simple-select-label"
                id="demo-simple-select"
                value={category || ""}
                onChange={(e) => setCategory(e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {pantry
                  ?.map((pan, index) => {
                    return (
                      <MenuItem key={index} value={pan?.category}>
                        {pan?.category}
                      </MenuItem>
                    );
                  })
                  .filter(
                    (item, index, self) =>
                      index ===
                      self.findIndex((t) => t.props.value === item.props.value)
                  )}
              </Select>
            </FormControl>
          </Box>

          <Box labelid="High to Low">
            <FormControl variant="standard" sx={{ minWidth: "200px" }}>
              <InputLabel>Quantity Range</InputLabel>
              <Select value={sortOrder} onChange={(e) => handleSortChange(e)}>
                <MenuItem value="">None</MenuItem>
                <MenuItem value="High">High to Low</MenuItem>
                <MenuItem value="low">Low to High</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Stack>

        <Stack width="800px" height="600px" spacing={2} overflow="auto">
          <Box
            width="100%"
            minHeight="50px"
            display="flex"
            alignItems="center"
            borderRadius="10px"
            justifyContent="space-around"
            bgcolor="#f0f0f0"
            padding={2}
          >
            <Typography
              variant="p"
              fontWeight="bold"
              width="200px"
              color="#333"
              textAlign="center"
            >
              Name
            </Typography>
            <Typography
              variant="p"
              width="200px"
              fontWeight="bold"
              color="#333"
              textAlign="center"
            >
              Quantity
            </Typography>
            <Typography
              variant="p"
              width="400px"
              fontWeight="bold"
              color="#333"
              textAlign="center"
            >
              Actions
            </Typography>
            <Typography
              variant="p"
              width="200px"
              fontWeight="bold"
              color="#333"
              textAlign="center"
            >
              Image
            </Typography>
          </Box>
          {(updatedPantry ? updatedPantry : pantry).map(
            ({ name, quantity, image }) => (
              <Box
                key={name}
                width="100%"
                minHeight="50px"
                display="flex"
                alignItems="center"
                borderRadius="10px"
                justifyContent="space-between"
                bgcolor="#f0f0f0"
                padding={2}
              >
                <Typography
                  width="200px"
                  variant="p"
                  color="#333"
                  textAlign="center"
                >
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Typography>
                <Typography
                  width="200px"
                  variant="p"
                  color="#333"
                  textAlign="center"
                >
                  {quantity}
                </Typography>
                <Stack
                  justifyContent="center"
                  width="400px"
                  direction="row"
                  spacing={5}
                >
                  <Button
                    variant="contained"
                    onClick={() => {
                      addItem(name);
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      removeItem(name);
                    }}
                  >
                    Remove
                  </Button>
                </Stack>
                <Link
                  width="200px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  href={image}
                  target="_blank"
                >
                  <OpenInNewIcon />
                </Link>
              </Box>
            )
          )}
        </Stack>
      </Box>
    </React.Fragment>
  );
}
