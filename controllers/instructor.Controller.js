import Instructor from '../DB/models/instructor.model.js';

// Create new instructor
export const createInstructor = async (req, res) => {
  
  try {
    const {image} = req.body;
        const {err} = instructorSchemaValidation.validate(req.body);
        if (err) return next(new ErrorClass(err.message, 500));
    
        let imagePath;
        if (image) {
          imagePath = image;
        } else if (req.file) {
          imagePath = `/uploads/${req.file.filename}`;
        } else {
          return res.status(400).json({error: 'Image is required (file or URL)'});
        }            
    const instructor = new Instructor(req.body);
    await instructor.save();
    logger.info('Instructor created successfully');
    res.status(201).json(instructor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all instructors
export const getAllInstructors = async (req, res) => {
  try {
    const instructors = await Instructor.find();
    res.status(200).json(instructors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get instructor by ID
export const getInstructorById = async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }
    res.status(200).json(instructor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update instructor by ID
export const updateInstructor = async (req, res) => {
  try {
    const instructor = await Instructor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }
    res.status(200).json(instructor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete instructor by ID
export const deleteInstructor = async (req, res) => {
  try {
    const instructor = await Instructor.findByIdAndDelete(req.params.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }
    res.status(200).json({ message: 'Instructor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
