import projectModel from "../models/project.model";

export const createContribution = async (req, res) => {
    try {
        const { projectId, pixels } = req.body;
        const userId = req.user._id; // assuming you're using auth middleware

        // Validate project existence
        const project = await projectModel.findById(projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Create and save contribution
        const contribution = new Contribution({ projectId, userId, pixels });
        await contribution.save();

        // Update project stats (pixel count & contributor count)
        project.stats.pixelCount += pixels.length;

        const alreadyContributor = project.contributors.some(
            (c) => c.userId.toString() === userId.toString()
        );
        if (!alreadyContributor) {
            project.stats.contributorCount += 1;
            project.contributors.push({ userId });
        }

        await project.save();

        res.status(201).json({
            message: 'Contribution saved successfully',
            contribution
        });
    } catch (error) {
        console.error('Create contribution error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};